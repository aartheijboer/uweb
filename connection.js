

function decode_resp(tdata) {
	data = new Uint8Array(tdata);
    if (data[0] == 'W'.charCodeAt(0) && data[1] == 'B'.charCodeAt(0)) {
        var code = data[2] | (data[3] << 8);
        return code;
    } else {
        return -1;
    }
}

if ( typeof(ui_set_status) == 'undefined')  ui_set_status = ( status ) => {
        console.log("status=",status);
}



let set_status = ui_set_status;

     
function createWebreplConnection( ws_url , password  ) {


	let ws; // websocket object - created in reset

	// the object we are going to return

	let r = {

		text_received : "" ,
		out_received : "" ,
		err_received : "" ,


		// is the connection ready to send something?
		ready : () => ws.state == 0 ,


		// 
		run : ( command, on_reply_complete ) => {

			r.send( command, 
				    ( out, err ) => {},
				    on_reply_complete,
				    true );
		},


		// the main function that handles communication

		send : function( msg ,    // the msg to send
		    on_reply,             // called as input is comming in
		    on_reply_complete ,   // called when upython is done sending reply 
		    raw = false ,         // if raw, we will send x04 after the message
		    force = false  )      // force sending even if state is not zero 
		{
			if ( !r.ready() && !force )
			{
				console.log("cannot send : wrong state ", ws.state )
				return;
			}	

			let org_message_received = r.message_received;
			let org_handle_input     = r.handle_input;

			if (on_reply)           r.handle_input     = on_reply;

			if (on_reply_complete) r.message_received = (out, err ) => {

				// completely handed message and its response.

				console.log( on_reply_complete );

				on_reply_complete( out, err );
				r.message_received = org_message_received;
				r.handle_input     = org_handle_input;
			};


			console.log(ws.state, "send called with", msg );
			set_status("state : "+String(ws.state) );


			var chunksize = 100; // todo: find out what max chunksize is
			for ( p = 0 ; p < msg.length; p+= chunksize ) {
				ws.send( msg.slice(p,p+chunksize) );
			}

			if (raw) ws.send("\x04");

			if ( ws.state == 0 ) ws.state =1 ;
			set_status("state : "+String(ws.state) );
		},


		// receive is called by onmessage to accumalate the reply

		receive : function ( tag, txt ) { 
			
			

			if (tag == "out") r.out_received += txt;

			if (tag == "err") r.err_received += txt;

			r.handle_input( r.out_received, r.err_received );


			if (tag == "end") {
				r.message_received( r.out_received, r.err_received );
				r.out_received = "";
				r.err_received = "";
			}
		},


		message_received( out, err ) { alert( "got  " + out + " err =" + err ); },

		handle_input :  function ( txt, tag ) {},

		reset : function () 
		{
			console.log( ws_url, password );

			ws = new WebSocket( 'ws://'+ ws_url);
			r.socket = ws;

			ws.onopen    = function() { r.onopen(); } ;

			ws.onmessage = function( event ) { r.onmessage(event); } ;

			ws.onclose = ( closeevent ) => { console.log("socket closed!",closeevent); } ;

		},


		setstate : function ( value ) {
			ws.state = value;
		},


		raw : function() { 
			var craw    = "\x01"; // switch to raw mode
			r.send(craw);
			ws.state = 0;   
			},

		normal : function() {
			var cnormal = "\x02"; // switch to normal mode
			r.send(normal); 
			// todo : state machine
			},

		onopen : function () {
			console.log("websocket open! connection live!") ; 
			},

		onlogin : function () {
			console.log("logged in (you should supply a more useful onlogin")
		},

	
		onmessage : function(event) { 
			
			console.log( "got ws msg", ws.state, JSON.stringify(event.data) ); 


			if ( event.data == "Password: " )
			{
				ws.send(password+"\r");
				ws.state = 100; // wait for login

				ws.state_0_callback = function( evt ) {
					//console.log("going raw", this);
					r.raw(); // interesting?
					ws.state=110; // wait for switch to raw

					ws.state_0_callback = function (evt) {
						ws.state_0_callback = undefined; // only once
						r.onlogin();
					}					
				}
				return;
			}

			// state 
			// 1 : just sent msg, wait for "OK"
			// 2 : ok received, collect data           
			// 3 : ok not received (e.g. syntax error) 
			// 4,5,6 x x > 
			// 0 : ready to send



			let initial_state = ws.state;

			switch( ws.state )
				{

					case 1 :
						if ( event.data == "OK" ) ws.state = 2;
						else 
						{	
							console.log("recieved something that is not 'OK' : ", event.data );
							ws.state = 3;
						}
						break;

					case 0: // outputting output
						console.error( "received something from device while not expecting: ", event.data);
						r.receive('unexp',event.data);
						break;

					case 2: 
					case 3:
						if ( event.data == "\u0004" ) ws.state = 4;
						else r.receive('out',event.data);
						break;

					case 4 : // reading stderr
						if ( event.data == "\u0004" ) ws.state = 5;
						else r.receive('err',event.data);
						break;

					case 5 :
						if ( event.data == ">" ) {
							ws.state = 0;
							r.receive('end','');
							}	

						break;

					case 100 : // after sending password
						if ( event.data == "\r\nWebREPL connected\r\n>>> ") {
							ws.state = 0; // ready to send 
						}
						else { // got some error
							console.log("failed to log in");

						}
						break;

					case 110: // after sending raw()
						if ( event.data = "raw REPL; CTRL-B to exit\r\n" ) {
							ws.state = 111;
						}
						break;

					case 111: 
						console.log("sjkla", event.data , event.data == ">")
						if ( event.data == ">" ) {
							ws.state = 0;
						}			
						break;


					// ----------------- file put protocol -----------------------
					case 300 : // just sent a PUT
						console.log("got", ws, event );

						if (decode_resp(event.data) == 0) {
                            // send file data in chunks
                            for (var offset = 0; offset < r.put_file_data.length; offset += 512) {

                            	let chunk  =r.put_file_data.slice(offset, offset + 512) ;
                            	console.log("send", chunk);
                                ws.send( chunk );
                            }
                            ws.state = 301;
                        }
                        break;


                    case 301:
                        // final response for put
                        if (decode_resp(event.data) == 0) {
                            set_status('Sent ' + r.put_file_name + ', ' + r.put_file_data.length + ' bytes');
                        } else {
                            alert('Failed sending ' + r.put_file_name);
                        }
                        ws.state = 0;
                        break;

				}	

			if ( initial_state != ws.state && ws.state == 0 ) {
				console.log("xxxx", ws.state_0_callback);

				if (ws.state_0_callback) {
					ws.state_0_callback( event.data );
					
				}
			}

			set_status("state : "+String(ws.state) )

		},


		put_file : function( file_name , txt ) {

			r.put_file_name = file_name;
			
			var enc = new TextEncoder();
			r.put_file_data = enc.encode( txt );

		    var dest_fname = r.put_file_name;
		    var dest_fsize = r.put_file_data.length;

		    // WEBREPL_FILE = "<2sBBQLH64s"
		    var rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
		    rec[0] = 'W'.charCodeAt(0);
		    rec[1] = 'A'.charCodeAt(0);
		    rec[2] = 1; // put
		    rec[3] = 0;
		    rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
		    rec[12] = dest_fsize & 0xff; rec[13] = (dest_fsize >> 8) & 0xff; rec[14] = (dest_fsize >> 16) & 0xff; rec[15] = (dest_fsize >> 24) & 0xff;
		    rec[16] = dest_fname.length & 0xff; rec[17] = (dest_fname.length >> 8) & 0xff;

		    for (var i = 0; i < 64; ++i) {
		        if (i < dest_fname.length) {
		            rec[18 + i] = dest_fname.charCodeAt(i);
		        } else {
		            rec[18 + i] = 0;
		        }
		    }

		    // initiate put
		    
		    set_status('Sending ' + r.put_file_name + '...'  );
		    ws.state = 300;
		    ws.binaryType = 'arraybuffer';
		    ws.send(rec);

		}	



	};

	r.reset();
	return r;

}

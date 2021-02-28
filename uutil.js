
let gMachineState = {

	refresh : () => {


		let ms = gMachineState;


		let x = `dev : ${ms.machine} <br> `
		    x +=`ram : ${ms.mem_free} / ${ms.mem_free+ms.mem_alloc} bytes free <br> `
		    x +=`fs  : ${ms.bsize* ms.bfree} / ${ms.bsize*ms.blocks} bytes free `

		$(".w2ui-sidebar-bottom")[0].innerHTML = x;

		//ui_set_status(x);

	}

};


let uutil = {

	handle : ( onsucces ) => {
			let f = ( out, err ) => {

				if ( err.trim() != "" ) {
					console.log("there was some error", err );

				}
				else onsucces( out );
			};

			return f;
		},


	// get a file from the upython device. onready will be called
	// with the text of the file.	

	get_file : (fullpath, onready ) => {

		const cmd = 'print(open("'+fullpath+'").read())';

		// run wants a function to handle out and err. handle makes one.
		gConnection.run( cmd, uutil.handle (onready) );
	},



	// Get a directory from the upython device. The callback
	// will be passed a the fullpath and a tree with the contents.

	get_dir : ( fullpath , onLoadDir ) => {	

		const cmd = `for x in uos.ilistdir('${fullpath}') : print(x) \r`;



		let xparse = ( listing ) => {

			console.log("got directory", listing )
			
			let a = "[" +   listing.trim().
							replace(/\'/g, '"').
							replace(/\(/g, "[").
							replace(/\)/g, "]").
							replace(/\n/g, ",") + "]";
			let arr = JSON.parse(a);
			


			// function cb  (  )  {

			// 	console.log('user wants ', this.fullname );

			// 	if ( this.id_dir ) get_dir( this.fullname, onNewDir ); // same onNewDir

			// 	else               get_file( this.fullname, onNewFile );

			// };


			let to_node = ( arr ) => ({ name       : arr[0],
				  		                fullname   : fullpath+"/"+arr[0],
				  	                    is_dir     : arr[1]==16384,
				  		                filesize   : arr[3] });


			data = JSON.parse(a).map( to_node );
			return data;
		};

	
		let onready = ( txt ) => onLoadDir ( fullpath, xparse ( txt ) );

		gConnection.run( cmd, uutil.handle( onready ) );

	},

	get_sysinfo : () => {

    	const cmd = `import os,gc,machine
print(os.uname(),os.statvfs('/'),gc.mem_free(),gc.mem_alloc(),machine.freq())`;


		const onready = ( txt ) => {

			let out = "";
			let map = { '(' : ' ', ')' : ' ', ',': ' ' };
			let quote = false;


			for (let i = 0 ; i < txt.length; i++ )
			{
				
				const c = txt[i];
				let r = c;

				if ( c == '"' || c == "'" ) quote = !quote; // cant handle quotes in quotes

				if (!quote) if ( c in map ) r = map[c];
				if (quote &&  c==" ") r = "_";
 				out += r;
			}

			const a = out.trim().split(/\s+/);

			const num = n => isNaN(Number(n)) ? n : Number(n)


			const b = a.map( s => s.includes('=') ? s.split('=')[1].replace(/\'/g,"")  : num(s) )

			let names = "sysname nodename release version machine ";                         // uname 
			names +=    "bsize frsize blocks bfree bavail files ffree favail flag namemax "; // statvfs
			names +=    "mem_free mem_alloc freq";

			names.split(" ").forEach( (key,i) => gMachineState[key] = b[i] );

			gMachineState.refresh();

		};

		// update the state every 10 sec

		const ff__ = () => {
			if ( gConnection.ready() ) gConnection.run( cmd, uutil.handle ( onready ));
			else console.log("dont get machine state, casue doing something else.");
			setTimeout( ff__, 10000);
		};

		ff__();


		
		
		             
	}

};

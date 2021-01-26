

let menu_definition = {
	
	File___New : () => {
		
		ui_new_file_editor( "untitled","untitled","");
	},


	File___Open_Local_File : () => {
		
		var input = document.createElement('input');
		input.type = 'file';

		input.onchange = e => { 

   			var file = e.target.files[0]; 

   			const r = new FileReader();
   			r.onload = () => {
   				ui_new_file_editor( file.name, file.name , r.result );
   			}

   			r.readAsText( file );
   			console.log( e.target );
		}

		input.click();
    }, 


	File___Download : function () {

		const e = ui_active_editor();
		if (!e) {
			alert("no active editor");
		}

		const data = e.getValue();
		const name = ui_get_active_tab().id;

		function download(content, fileName, contentType) {
    		var a = document.createElement("a");
		    var file = new Blob([content], {type: contentType});
		    a.href = URL.createObjectURL(file);
		    a.download = fileName;
		    a.click();
		}

		download( data , name , 'text/plain');
	},

	File___Save_to_Device : function () {

		const e    = ui_active_editor();
		const name = ui_get_active_tab().id;
		
		gConnection.put_file( name, e.getValue() );

    },

    File___Save_to_Device_As : function () {

		const e    = ui_active_editor();
		const t    = ui_get_active_tab();
		const oid  = t.id;
		t.id = prompt("Please enter the full file name", t.id );
		w2ui.layout_main_tabs.active = t.text = t.id;
		w2ui.layout_main_tabs.remove( oid );
		w2ui.layout_main_tabs.render();
		menu_definition.File___Save_to_Device();
    },


	uPython___Run : () => {		
	},

	uPython___Send_Ctrl_C : function () {

		// ctrl-c is normally sent when we are waiting for output, i.e. state == 2
		// in this case, we should just send ctrl-c and not the (raw) x04 after it.
		// no idea why
		// If we , however, send Ctrl-C from some other state then 2, the repl
		// does not go through all steps, but just says "OK" and "\r\n"

		gConnection.send("\x03", false, undefined, undefined, true );
	},


	uPython___SoftReset : function() {

		gConnection.send("import sys\nsys.exit()",
			true,
			function (){console.log("softreset done")});
	},


	uPython___HardReset : function() {

		gConnection.send("import machine\nmachine.reset()",
			true,
			undefined);
			// after machine.reset, do don't get and answer -- 
			// need to re-log-in

		gSkipLogin = true;
		gConnection.reset();
	}
}




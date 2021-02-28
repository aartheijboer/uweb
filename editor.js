

addToolbar = ( editor ) => {

 	const p = editor.display.wrapper.parentElement;

 	const d = document.createElement('div');

 	d.style.padding     = "1px";
	d.style.marginLeft  = "15pt";
	d.style.marginRight = "20pt";
	d.style.marginTop   = "5pt";
	d.style.overflow    = "auto";
	d.style.maxHeight   = "140px";

	d.style.border      = "0px solid #aaa"

	console.log( editor.id );

 	const config = {
 		name : editor.id + "taskbar",
 		items : [
 			 { type    : 'button', 
 			   icon    : 'fa fa-play',  
 			   tooltip : 'run on device (ctrl-enter)', 
 			   onClick : () => console.log("click") },

             { type    : 'button', 
               icon    : 'fa fa-trash', 
               tooltip : 'delete this editor' ,        
               onClick : () => console.log("click") },

             { type    : 'button',
               icon    : 'fa fa-reply',
               tooltip : 'undo (ctrl-z)',
               onClick : () => editor.undo() },

             { type    : 'button',
               icon    : 'fa fa-share',
               tooltip : 'redo (ctrl-y)',
               onClick : () => editor.redo() },

			 { type    : 'button',
               icon    : 'fa fa-plus-square',
               tooltip : 'new editor below this one',
               onClick : () => console.log("add editor") },


        ]
 	}

 	$(d).w2toolbar( config );
 	editor.display.wrapper.before( d );
}

createEditor = ( container , val="" ) => {


	if ( typeof createEditor.counter === 'undefined' )
	{
		createEditor.counter =0;		
	}
	createEditor.counter++;

	let config = {  lineNumbers  : true       ,
				 	mode         : "python"   ,
				 	lineWrapping : true       ,
				 	value        : val  
				 };

	let editor = CodeMirror( container, config );
	editor.id = "cm"+ createEditor.counter; // some unique name
	editor.history_index = 0; // for scrolling in history
	
	editor.history = ( d ) => {

		editor.history_index += d;
		if ( editor.history_index < 0 ) editor.history_index = 0;

		let t = gHistory.get( editor.history_index+1 );

		if ( t ) {
			editor.setValue( t );
		}

	};

	let oldActivate = container.onActivate;

	container.onActivate = () => { 
		if (oldActivate) oldActivate();
		editor.refresh() ; 
		editor.focus(); // put the cursor in
		console.log("activate"); 
	};

	container.editor = editor;
	return editor;
};


let createNotebookOutputBox = ( container ) => {

	let d = document.createElement('div');
	//d.style.whiteSpace = "pre";
	d.style.fontFamily  = '"Courier New", Courier, monospace';
	d.style.fontSize    = "12px";
	d.style.whiteSpace  = "pre";
	d.style.padding     = "5px";
	d.style.marginLeft  = "20pt";
	d.style.marginRight = "20pt";
	d.style.overflow    = "auto";
	d.style.maxHeight   = "140px";
	d.style.border      = "1px solid #aaa";


	d.innerHTML = "";

	d.received = { "out" : "", "err" : "" };

	d.receive = ( txt, tag ) => {
		d.received[ tag ] += txt;
	}

	container.appendChild( d );
	
	return d;
};



let createNotebookInputBox = ( container, connection ) => {


	let first = !( "done" in createNotebookInputBox );
	createNotebookInputBox.done = true;

	let v = first ? "print('hello micropython!') # ctrl-enter to run this" : "";


	let e = createEditor ( container , v );

	addToolbar( e );


	e.outputBox = createNotebookOutputBox( container );

	e.nextInputBox = () => {
		const l = container.querySelectorAll(".CodeMirror");

		for ( let i = 0 ; i < l.length-1 ; i++ ) {
			if ( l[i].CodeMirror == e ) return l[i+1];
		}
		return createNotebookInputBox( container, connection );
	}


	let runcontent = ( code ) => {

		e.outputBox.innerHTML = "";

		gHistory.add( code );

		connection.send( code, 
                         ( out, err ) => { 
                         	//console.log( out );
                         	//console.log( err );
                         	e.outputBox.innerHTML = `<span style="color:#0000FF";>${out}</span><span style="color:#FF0000";>${err}</span>`;
                         	//e.outputBox.innerHTML.scrollIntoView(false);
                         	e.outputBox.scrollTop = e.outputBox.scrollHeight;
                         },
                         	
                         ( out, err ) => { e.nextInputBox(); },
                         true );
	};


	e.setOption("extraKeys", { 
		"Ctrl-Enter": (cm) => { 
			let pythoncode = cm.getValue();
      		runcontent( pythoncode ); 
    	},

    	"Ctrl-Up" : (cm) => { cm.history( 1 ); },

    	"Ctrl-Down" : (cm) => { cm.history( -1 ); }
    	}

    );

	return e;
};




function createNotebook( container , connection ) {

	let notebook = {

		container : container,

		connection : connection ,

		input :  createNotebookInputBox ( container, connection ),

		get_content : () => {

			const l = container.querySelectorAll(".CodeMirror");

			for ( let i = 0 ; i < l.length-1 ; i++ ) {
				console.log( l[i].textContent );
			}
		}

	};

	return notebook;

};

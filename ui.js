
ui_style = "font-family: Verdana, Arial, sans-serif; font-size:11px; padding:10px;";


let firstwhere = ( list , attribute, operator, value ) => {
  let f = eval( ` (elem) => elem.${attribute} ${operator} ${value} ;` );
  return list.filter( f )[0];
}



let ui_config = {
    layout: {
        name: 'layout',
        padding: 0,
        panels: [
            { type: 'top' ,    size: 30, resizable: false },
            { type: 'bottom' , size: 30, resizable: false , style: ui_style },
            { type: 'left',    size: 200,resizable: true, minSize: 120 },
            { type: 'main',    
              overflow: 'hidden',
              
              tabs : {   

                style: 'border-top: 0px; padding: 10px;',
                name : "tabs",
                active: 'tab0',

                tabs  : [],
                
                onClick: function (event) {
                    let tabs = w2ui.layout_main_tabs.tabs;
                    let clicked_tab = tabs.filter( e => e.id === event.target )[0];
                },

                onRefresh : () => ui_update_tabs() ,
                
                onClose: function (event) {
                    this.click('tab0');
                }            
              }
            } ] 
    },
      

    toolbar: {

        name : 'toolbar',
        items: [ 

                // file & upython menus will will filled by ui_create_menus
                { type: 'menu', id: 'File', text: 'File', icon: 'fa fa-table', items: [] },
                { type: 'menu', id: 'uPython', text: 'uPython', icon: 'fa fa-table', items: [] },
                
                { type: 'spacer' },
                
                { type: 'html',  
                  id: 'ipbox',
                  value: 'hi',
                  html: item => `<div style="padding: 3px 10px;"> IP : 
                                 <input 
                                      id       = ${item.id}
                                      size     = "15" 
                                      onchange = "w2ui.toolbar.set('ipbox', { value: this.value });"
                                      style    = "padding: 3px; border-radius: 2px; border: 1px solid silver" 
                                      value    = ${item.value || ''} />
                                 </div>`   
                },

                { type: 'html',  
                  id: 'pwbox',
                  value: 'hi',
                  html: item => `<div style="padding: 3px 10px;"> pass : 
                                 <input 
                                      id       = ${item.id}
                                      size     = "10" 
                                      onchange = "w2ui.toolbar.set('pwbox', { value: this.value });"
                                      style    = "padding: 3px; border-radius: 2px; border: 1px solid silver" 
                                      value    = ${item.value || ''} />
                                 </div>`   
                },

                { type : "button", 
                  id:"Connect", 
                  text:"Connect", 
                  callback: () => { uweb_connect( $("#ipbox")[0].value , $("#pwbox")[0].value ); }

                } 

                ],

        onClick : function( event ) {

          //console.log( "clicked! ", event.target, event , this.get(event.target) );
          let cb = this.get(event.target).callback;
          if ( cb ) cb() ;
        }
            
    },

    sidebar: {
        name: 'sidebar',


         menu : [
        { id: 1, text: 'Item 1', img: 'icon-page' },
        { id: 2, text: 'Item 2', img: 'icon-page' },
        { id: 3, text: 'Item 3', img: 'icon-page' },
    ],

        img : null,
        nodes: [ 
           { id: '/', text: '[not connected]', group: true, expanded: true, nodes: [] }

        ],
        onClick: function (event) {

			 
        const node = this.get(event.target);

        console.log( event.target, node )

  			f = this.get( event.target );
  			if ( f.callback ) { f.callback(); }
        this.refresh();
        }
    }
};


let find_node = ( id_to_find , nodeslist = w2ui.sidebar.nodes ) => {

  // depth-first search in all sub-node-lists.
  for ( n of nodeslist ) {
    if ( n.id == id_to_find ) return n;

    if ('nodes' in n ) {
      const x = find_node( id_to_find, n.nodes );
      if (x) return x;
    }
  }

  return undefined;
};


let ui_update_dir_at = ( at = "/ " ) => {
  console.log( "update" , at );
  uutil.get_dir( at , ui_set_sidebar_dir );
}


var lasted;

let ui_new_file_editor = ( fullname, tabheader, content = undefined ) => {

  ui_new_tab( fullname, tabheader );
  let d = ui_tab_content( fullname );
  let ed = createEditor( d );


  d.style.overflow = "hidden";

  lasted = ed;

  if ( typeof content === 'undefined')
   uutil.get_file( fullname , txt => { console.log("fot",txt); ed.setValue( txt ); ed.refresh(); } );

  else 
  {
    ed.setValue( content );
    window.dispatchEvent( new Event("resize")); // arrgh
   }


  w2ui.layout_main_tabs.click( fullname );

  ed.setSize("90%","90%")

}



let ui_set_sidebar_dir = ( at = "/" , files ) => {


  console.log(" got files ", files )

  // files is a list return by uutil.get_dir

  let construct_treenode = ( obj ) => {

    let nodes = [];
    if (obj.is_dir) nodes = [ { id : "dum"+obj.fullname } ];

    return {...{ nodes    : nodes,
                 expanded : false,
                 onExpand : event => { console.log("expand", obj.fullname); 
                                       obj.is_dir? ui_update_dir_at( obj.fullname ) : undefined }, 

                 onClick  : event => { console.log("click", obj.fullname);
                                       if (!obj.is_dir ){

                                        
                                        ui_new_file_editor( obj.fullname, obj.fullname );

                                       }


                                     },

                 id       : obj.fullname,
                 text     : obj.fullname.split("/").pop(),
                 img      : obj.is_dir ? "icon-folder" : "icon-page" },...obj }; 
  }

  let c = files.map ( construct_treenode );

  w2ui.sidebar.get( at ).nodes = []; // remove any dummy nodes that are there
  w2ui.sidebar.add( at, c );

  w2ui.sidebar.refresh();
};


let ui_set_status = (txt) => {
  w2ui['layout'].html('bottom', txt );
}


let ui_create_menus = ( definition )  =>  // definition in menu.js, defines callbacks
{
  r = w2ui.toolbar.items;

  for (s in definition) {

    [menuname,funcname] = s.split('___');
    func = definition[s]

    let a = r.filter( it => it.text === menuname )[0];

    if ( !a ) {
      //console.log("ad");
      r.push( { type: 'menu', id: menuname, text: menuname, icon: 'fa fa-table', items: [] } );
      a = r.filter( it => it.text === menuname )[0];
    }
    a.items.push( {text: funcname, icon: 'fa fa-camera', callback: func  } );
  }

  w2ui.toolbar.items.push(...r);
  w2ui.toolbar.refresh();
  return r;

}


let ui_get_tabs = () => w2ui.layout_main_tabs.tabs;

let ui_get_active_tab = () => w2ui.layout_main_tabs.get(w2ui.layout_main_tabs.active);


let ui_tab_content = ( tabid ) => {

  // create a div or return the existing one. 
  // stored in tab.content
  let t = ui_get_tabs().filter( e => e.id === tabid )[0];

  if (!t) {
    console.log( "No tab with id", tabid , ui_get_tabs() );
    return; 
  }

  if ( t.content ) return t.content;

  // create a div in the main window to hold the content

  t.content = document.createElement('div');

  t.content.style.height   = "100%";
  t.content.style.overflow = "auto";

  w2ui.layout.el('main').appendChild( t.content );
  return t.content;
}


let ui_new_tab = ( tabid , label  ) => {

  w2ui.layout_main_tabs.add( { id : tabid , text : label , closable : true } );
}

let ui_update_tabs = () => {


  // show only the content of the active tab.
  active = w2ui.layout_main_tabs.active;

  ui_get_tabs().forEach( t => {

    if (! t.content || !t.content.style ) return;
    if ( t.id === active ) t.content.style.display = "block";
    else                   t.content.style.display = "none";
  });

}

ui_active_editor= () =>{

    let c = Array.from( ui_get_active_tab().content.querySelectorAll(".CodeMirror") );
    return c[0].CodeMirror;

}



let ui_init = () => {
  // initialization
  $('#main').w2layout(ui_config.layout);
  w2ui.layout.html('main', $().w2tabs(ui_config.tabs));
  w2ui.layout.html('left', $().w2sidebar(ui_config.sidebar));
  w2ui.layout.html('top',  $().w2toolbar(ui_config.toolbar ));
  console.log( $("#ipbox")[0] );

  ui_create_menus( menu_definition );

  ui_set_status("this is the status bar");
}
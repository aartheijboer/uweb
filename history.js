

let getHistory = () => {
	
	let r = {

		history : [], // oldest first

		maxSize : 200, 

		trim : () => {
			while( r.history.length > r.maxSize ) r.history.shift() ;
		},

		save : () => {
			localStorage.setItem('uweb_hist', JSON.stringify(r.history));
		},

		load : () => {
			const j = localStorage.getItem('uweb_hist');

			console.log("history loaded", j );

			let x = JSON.parse(j);

			if ( Array.isArray( x ) && x.length > 0 ) r.history = x;
			else r.history = [];
		},

		add : ( content ) => {

			// don't add the same thing twice in a row
			if ( content === r.get(0) ) {
				console.log("not recording duplicate");
				return;
			}

			r.history.push( content );
			r.trim();
			r.save();
		},

		clear : () => {
			r.history = []
			save();
		},

		get : ( n ) => {
			const i = r.history.length - n - 1;
			if ( i < 0 ) return undefined;
			return r.history[i];
		},

		me : () => {
			return r;
		}
	}

	r.load();
	return r;
}
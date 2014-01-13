(function () {

var handlers = {
};


var keyid = localStorage.getItem("tictac.keyid"),
	secret = localStorage.getItem("tictac.secret");

var chains = {};

function chain(key, fn) {
	var chain = chains[key] || [];
	chain.push(fn);
	chains[key] = chain;
}

/**
 * send
 *
 * low-level networking that handles redirects and verification
 *
 */


function send(method, url, data, retry) {

	var $d = $.Deferred();				
	function ok() { $d.resolve.apply($d, arguments); };
	function fail(jqXHR) { 
			
		switch (jqXHR.status) {
		case 500:
		case 501:
		case 503: // check for retry-after
		case 504:
		case 404:

			console.log("retry after 500ms");
			return setTimeout(function () {
				send(method, url, data).done(ok).fail(fail);
			}, 500);
				
		default: $d.reject.apply($d, arguments); 		
		}	
	};
	var headers = {};
	var contentType;
	switch (method) {

		case 'POST':
		case 'PUT':

//			if (!keyid) {

//				send('GET', '/register.html');

//				return $d;

//			}

			if (typeof data === 'object') {
				data = JSON.stringify(data);
				contentType = 'application/json; charset=utf-8';
			}


			console.log('signing with ' + secret);
		
			headers = { 'Authorization': 'TicToc ' + keyid + ':' + 
					CryptoJS.HmacSHA1(data,secret)
							.toString(CryptoJS.enc.Base64)   
			};

		default:

			var options = {
				type: method,
				url: url,
				data: data,
				headers: headers
			};

			if (contentType) options['contentType'] = contentType;
	
			$.ajax(options).done(function (data, textStatus, jqXHR) {
				
				console.log(method + ' ' + url + ' => ' + textStatus);

				var contentType = jqXHR.getResponseHeader('Content-Type');
				console.log(contentType);
			
				if (contentType) {
				for (handler in handlers) {
					if (contentType.indexOf(handler) != -1) {
				 		handlers[handler](data, jqXHR, function next() {});
					}
				}
				}
				ok(data, textStatus, jqXHR);
				
			})
			.fail(function (jqXHR) {
				console.log(method + ' ' + url + ' => ' + jqXHR.status);
			})
			.fail(fail);
	}

	return $d;

}

this.tictac = {

	get:  function (url, data) { return send('GET',  url, data); },
	post: function (url, data) { return send('POST', url, data); },
	put:  function (url, data) { return send('PUT',  url, data); },
	handle: function (type, handler) {
		if (!handler) delete handlers[type];
		else handlers[type] = handler; 

	},
	set:  function (handler, callback) { 
			if (!callback) delete handlers[handler];
			else handlers[handler] = callback; 
	},	
	key: function (_keyid, _secret) {
		localStorage.setItem("tictac.keyid",  keyid = _keyid);
		localStorage.setItem("tictac.secret", secret = _secret);		
	},
	chain: function (id, resolution) {

		var chain = chains[id];
		if (!chain) return;

		chain.forEach(function (deferred) {
			console.log(deferred);
			switch (resolution) {
				case 'resolve': return deferred.resolve(); 
				case 'reject':  return deferred.reject();
			}
		});

	}
	


};

}).call(this);

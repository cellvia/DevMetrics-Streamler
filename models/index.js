/* this automatically loads all the models from the current directory into the returned object */

var fs = require('fs'),
	obj = {},
	debug = false || require('../settings').debug;

module.exports = obj;

fs.readdirSync(__dirname).forEach(function(name){
	var ext = name.length-3;
	if(name === "index.js" || name.indexOf('.js') != ext) return;
	debug && console.log("model source filename:" + name);

	if( name.toLowerCase() === "fixfor.js" ) name = "FixFor.js";
	name = name.substring(0,1).toUpperCase() + name.substring(1,ext);
	debug && console.log("model name:" + name);

	obj[name] = require('./'+name.toLowerCase());
});

debug && console.log("model final obj:"+JSON.stringify(obj));

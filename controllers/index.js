/* this automatically loads all the controllers from the current directory into the returned object */

var fs = require('fs'),
	obj = {},
	debug = false || require('../settings').debug;

module.exports = obj;

fs.readdirSync(__dirname).forEach(function(name){
	var ext = name.length-3;
	if(name === "index.js" || name.indexOf('.js') != ext) return;
	debug && console.log("source controller filename:" + name);
	
	name = name.substring(0,ext);
	debug && console.log("controller name:" + name);
	
	obj[name] = require('./'+name);
});

debug && console.log("controller final obj:"+JSON.stringify(obj));

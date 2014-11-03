var argv = require('optimist');

//curry default values for a function
Function.prototype.curry = function() {
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function() {
      return fn.apply(this, args.concat(
        Array.prototype.slice.call(arguments)));
    };
};

//for debuggind purposes, return true 
console.log = function(d){
	process.stdout.write(d + '\n');
	return true;
}

if(process.version < "v0.8.0"){
	process.hrtime = function(){return 0}; 
}

//clean array of empty values
Array.prototype.clean = function() {
	var len = this.length;
	var output = [];
	this.forEach(function(me){
		if (me.length) output.push(me);
	});
	return output;
};
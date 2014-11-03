/**
 * New node file
 */

var Arrays = function(){
    
};


Arrays.contains = function(array, object){
	if (!array||array.length<1) return false;
	if(!object) return false;
	for(var i=0, len=array.length; i<len; i++){
		if (array[i]===object)
			return true;
	}
	return false;
};

Arrays.containsArray=function(array, objectArray){
	if (!array||array.length<1) return false;
	if(!objectArray || objectArray.length<1) return false;
	
	for(var i=0, len=array.length; i<len; i++){
		var subarray = array[i];
		if (subarray.length!=objectArray.length) continue;
		var test = false;
		for(var j=0, len2=subarray.length; j<len2; j++){
			if (subarray[j]===objectArray[j])
				test=true;
			else {test=false; break;}
				
		}
		if (test) return true;
		
	}
	return false;
}


function parseJsonFile (path){
	var obj = require(path);
	return obj;	
}



module.exports = {
    Arrays: Arrays,
	parseJsonFile: parseJsonFile
};
 
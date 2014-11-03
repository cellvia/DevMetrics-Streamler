var	settings = require('../settings');
var fs = require('fs');
var metricUtils = require('./metricUtils');
var toposort = require('toposort');

var METRIC_FILE_NAME='metric.json';
var METRIC_PATH = settings.metricpath;
var PATH='';
function resolve(rootpath,metrics){
    PATH=rootpath+METRIC_PATH;
	if (!metrics || metrics.length<1){
	    metrics = fs.readdirSync(PATH); 
	}	
	return processMetricList(metrics)
}

function processMetricList(data){	
		//processedMetrics[] used to avoid re-processing of an already processed metric that might 
		//reappear in the recursive call.
		var i=0, concat=null, independentMetrics=[],dependentMetrics=[] ,processedMetrics=[];
		data.forEach(function(metricdir){
			loadMetricObject(metricdir,dependentMetrics, independentMetrics, processedMetrics);
		});				
		//topologically sort the metrics based on dependencies and return the ordered array.	
		dependentMetrics = toposort(dependentMetrics).reverse();;
		//clean up references of independentMetrics present in the dependentMetrics array 
		while(dependentMetrics && dependentMetrics.length>0 && i<dependentMetrics.length){
			if (independentMetrics.indexOf(dependentMetrics[i])>=0){
				dependentMetrics.splice(i,1);
			}else i++;
		}
		concat = independentMetrics.concat(dependentMetrics);
		return concat;
		
}
// Recursive function to parse dependencies
// metricdir => metric name, dependents=> array of arrays for topological sort
//	independents=> list of metrics which do not have any dependency
//	processedMetrics => list of metrices already processed to avoid redundant processing
function loadMetricObject (metricdir,dependents, independents,processedMetrics){		
		if (processedMetrics && processedMetrics.indexOf(metricdir)>=0) return;
		processedMetrics.push(metricdir);		
		
		var metricDir = PATH+metricdir+"/"+ METRIC_FILE_NAME,
		  obj=null, dependancies=null;
		obj = metricUtils.parseJsonFile(metricDir);
		if (obj && obj.active===true){
            dependancies = obj.dependencies;
    		if(dependancies && dependancies.length >= 0){
    			dependancies.forEach(function(dependancy){
    				var inpArray = [metricdir, dependancy];
    				if (!metricUtils.Arrays.containsArray(dependents,inpArray))
    					dependents.push(inpArray);	
    				loadMetricObject(dependancy,dependents, independents,processedMetrics);		
    			});   				
    		}else{			
    			if (!independents.indexOf(metricdir)>=0)
    				independents.push(metricdir);
    		}
		}			
}

module.exports = resolve;


var fs = require('fs');
var inflection = require('inflection');
var redis = require('redis');
var queue = require('queue');

createEntities = function(dataname, testdata, client) {
	var multi = client.multi();
	var single = inflection.singularize(dataname);
	
	testdata.forEach(function(dataItem) {
		var rkey = single+':'+dataItem.Id;
		multi.sadd(dataname, rkey);
		multi.set(rkey, JSON.stringify(dataItem));		
	});
	
	multi.exec(function(err, replies) {
		if (err) {
			console.log('Error');
			console.log(err);
		}
	});
}
processJsonFile = function(file, client, callback) {
	try {
		data = fs.readFileSync(file);
		var testdata = JSON.parse(data);

		//determine if we're dealing with a set of entities (array type)
		//or a set of pre-determined datum (object type)
		if (testdata instanceof Array) {
			var dataname = file.replace(/.*\//, '').replace('.json','').replace('_',':');
			createEntities(dataname, testdata, client);
		}
		else {
			for (var key in testdata) {
				if (testdata.hasOwnProperty(key)) {
					client.sadd(key, testdata[key]);
				}
			}			
		}
		callback(null, null);
	}
	catch(err) {
		console.log("problems reading json " + file);
		console.log(err);
	}
};

generateCaseHashes = function(client, callback) {
	var count = 0;
	var multi = client.multi();
	client.keys('case:*', function(err, keys) {
		keys.forEach(function(key) {
			++count;
			client.get(key, function(err, result){
				var obj = JSON.parse(result);
				for (var prop in obj) {
					if (obj.hasOwnProperty(prop)) {
						multi.set(prop + ':' + key, obj[prop]);
					}
				}
				multi.exec(function(err, result) {
					if (--count == 0) {
						callback(null, null);
					}					
				});
			});
		});
	});
};

createTestData = function() {
    var files = fs.readdirSync(__dirname+'/testdata/');
    var client = redis.createClient(6379, 'localhost');
    client.flushdb();
    var q = queue();

    files.forEach(function (file) {
        q.defer(processJsonFile, __dirname+'/testdata/'+file, client);
    });
    q.await(function(err, results) { 
		q.defer(generateCaseHashes, client);
		q.await(function(err, results) {
			client.quit();
		});
	});
};


exports.generateTestData = createTestData;

createTestData();
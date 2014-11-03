var redis = require('redis');
require('../lib/extensions');

//core methods for all models
module.exports = {
	loadFromCollection: function(port, host, constructor, collection, callback) {
		var client = redis.createClient(port, host);
		var objects = [];

		client.smembers(collection, function(err, reply) {
			if (err) { throw err; }

			var m = client.multi();
			reply.forEach(function(key){
				m.hgetall(key)
			});

			m.exec(function(err, results){
				client.end();
				callback(err, results);
			});
		});
	},
    
    members: function(port, host, query, suffix, callback){
        var client = redis.createClient(port, host),
        holder = [];
        var count = 0;
        client.smembers(query, function(err, members){
            if (err) { throw err; }
            
            members.forEach(function(member){
                
                client.smembers(member+suffix, function(err, values){
                    var m = client.multi();
                    values.forEach(function(value){             
                        m.hgetall(value);
                    });

                    m.exec(function(err, results){  
                        if(err) throw err;  
                        holder = holder.concat(results);
                        if(++count === members.length)
                        {   client.quit();
                            client.end();
                            callback(err, holder);
                        }   
                    }); 
                });
            });

        });
    },
    
	keys: function(port, host, query, callback) {
		var client = redis.createClient(port, host);
		client.keys(query, function(err, value){
			client.end();
			callback(err, value);
		});
	}, 

	scard: function(port, host, query, callback){
	    var client = redis.createClient(port, host);
	    client.scard(key, function(err, value){
	    	client.end();
	    	callback(err, value);
	    });
	},

	scard_multi: function(port, host, queries, callback) {
	    var client = redis.createClient(port, host);
	    var m = client.multi();

	    queries.forEach(function(q){
	    	m.scard(q);
	    });

	    m.exec(function(err, value){
	    	client.end();
	    	callback(err, value);
	    });
	},

	loadJson: function(port, host, key, callback) {
	    var client = redis.createClient(port, host);
	    client.hgetall(key, function(err, value){
	    	client.end();
	    	callback(err, value);
	    });
	}, 

	loadFromSortedCollection: function(port, host, constructor, collection, sortBy, sortOrder, start, limit, sortAlpha, callback) {
		var client = redis.createClient(port, host);
		var objects = [];
		var sortArgs = [];
		
		sortArgs.push(collection);
		sortArgs.push('by');
		if (sortBy) {
			sortArgs.push(sortBy + ':*');
			sortArgs.push(sortOrder == 1 ? 'DESC' : 'ASC');		
			if (sortAlpha == 1) {
				sortArgs.push('alpha');
			}				
		}
		else {
			sortArgs = sortArgs.concat(['Id:*', 'ASC']);
		}
		sortArgs = sortArgs.concat(['get', '*']);		
		client.sort(sortArgs, function(err, json) {
			client.quit();

			if (!err) {
				json.forEach(function(data) {
//skipping the constructor since it's a bit useless, TODO: refactor the contructor arg out completely							
//					objects.push(new constructor(data));
					objects.push(JSON.parse(data));							
				});
				callback(err, objects);
			}
			else {
				callback(err, null);
			}
		});
	}
}
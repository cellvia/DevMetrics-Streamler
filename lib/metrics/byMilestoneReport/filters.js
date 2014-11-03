var util = require("util");

module.exports = function(streamler){

  var through2 = streamler.through2;

  /************FILTERS********************/
  streamler
    .addFilter('tickets', function(){
      return through2.call(this, function(ticket){
        this.emit("data", ticket);
      });
    })
    .addFilter( 'milestoneReport', function(){
      return through2.call(this, function(ticket){
        var client = this.streamler.client;

        var openedOn = new Date(ticket.dtOpened).setHours(0,0,0,0);
        var category = ticket.ixCategory;
        var key = 'fogbugz:fixfor:' + ticket.ixFixFor + ':report:ticketsByMilestone:' + openedOn
        var categoryKey = 'fogbugz:fixfor:' + ticket.ixFixFor + ':report:ticketsByMilestone:' + openedOn + ':' + category

        client.del(key);
        client.del(categoryKey);

        client.hmset(key, 'epoch', openedOn);
        client.hincrby(key, 'cnt', 1);
        client.hmset(categoryKey, 'epoch', openedOn);
        client.hmset(categoryKey, 'category', ticket.sCategory);
        client.hincrby(categoryKey, 'cnt', 1);

        try {
          var closedOn = new Date(ticket.dtClosed).setHours(0,0,0,0);
          var key2 = 'fogbugz:fixfor:' + ticket.ixFixFor + ':report:ticketsByMilestone:' + closedOn
          var categoryKey2 = 'fogbugz:fixfor:' + ticket.ixFixFor + ':report:ticketsByMilestone:' + openedOn + ':' + category

          client.del(key2);
          client.del(categoryKey2);

          client.hmset(key2, 'epoch', closedOn);
          client.hincrby(key2, 'cnt', -1);
          client.hmset(categoryKey2, 'epoch', closedOn);
          client.hmset(categoryKey2, 'category', ticket.sCategory);
          client.hincrby(categoryKey2, 'cnt', -1);
        } catch(e) {
          console.log(e);
        }
        client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':report:ticketsByMilestone', key);
        client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':report:ticketsByMilestone:' + category, key);
        this.emit("data", ticket);
      });
    });

}

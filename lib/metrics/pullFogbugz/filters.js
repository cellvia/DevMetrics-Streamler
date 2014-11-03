var util = require("util");

module.exports = function(streamler){

var through2 = streamler.through2,
    reg;

if(streamler.settings.argv.date){
  var maxdate = streamler.settings.argv.date.toString();
  console.log("ATTEMPTING TO PROCESS AS OF "+ (new Date(maxdate)).toDateString() );
  if( !maxdate.match(/[12][09][019][0-9]-[0-9][0-9]-[0-3][0-9]/) ){
    console.log("DATE FORMAT YYYY-MM-DD required!");  process.exit(); 
  }else{
    maxdate = (+new Date(maxdate.replace("-", "/")));
    reg = new RegExp("Root cause milestone changed from '(.*?)' to '(.*?)'");
  }
}
var search = streamler.settings.argv.search;
if(search){
  console.log("searching events for: "+search);
  reg = new RegExp(search, "i");  
}

/************FILTERS********************/
streamler
  .addFilter( 'projects', function( options ){
    return through2.call(this, function(data){
      //if project is requested specifically via commandline, ignore other projects
      if(options.project && data.sProject.toLowerCase() !== options.project.toLowerCase()){
        return;
      }
      this.emit("data", data);
    });
  })
  .addFilter( 'cases', function( options ){ 
    return through2.call(this, function(ticket){
      //Undecided tickets needs a unique id for its milestone!
      if(ticket.sFixFor.toLowerCase() === 'undecided' || ticket.sFixFor === '') ticket.ixFixFor = ticket.ixProject+'00000';
      
      //these properties must be added in for pendingReviewAge
      ticket.milestoneDtStart = options.milestone.dtStart || 0;
      ticket.milestoneDt = options.milestone.dt || 0;

      delete ticket.sLatestTextSummary;
      
      this.emit("data", ticket);
    });
  })  
  .addFilter( 'cleanEvents', function(){
    return through2.call(this, function(ticket){
        if(ticket.events && ticket.events.$children){
          var newevs = [];
          ticket.events.$children.forEach( function(ev){
            newevs.push({
              sChanges: ev.sChanges ? ev.sChanges.$text : "",
              sVerb: ev.sVerb ? ev.sVerb.$text : "",
              dt: ev.dt ? ev.dt.$text : "",
              evt: ev.evt ? ev.evt.$text : "",
              ixPerson: ev.ixPerson ? ev.ixPerson.$text : "",
              sPerson: ev.sPerson ? ev.sPerson.$text : "",
              evtDescription: ev.evtDescription ? ev.evtDescription.$text : ""
            });
          });
          ticket.events = JSON.stringify(newevs);
        }
        this.emit("data", ticket);
    });
  })
  .addFilter('searchEvents', function(){
    return through2.call(this, function(ticket){
      if(ticket.events && ticket.events.$children){
        ticket.events.$children.forEach(function(evt){
          var s = evt.s && typeof evt.s.$text === 'string' ? evt.s.$text.match(reg) : false,
              desc =  evt.evtDescription && typeof evt.evtDescription.$text === 'string' ? evt.evtDescription.$text.match(reg) : false,
              sHTML = evt.sHtml && typeof evt.sHtml.$text === 'string' ? evt.sHtml.$text.match(reg) : false,
              sVerb = evt.sVerb && typeof evt.sVerb.$text === 'string' ? evt.sVerb.$text.match(reg) : false,
              logme = sVerb || s || desc || sHTML;
          logme && console.log(logme + "\nbugid: " + ticket.ixBug);
        });
      }
      this.emit("data", ticket);
    });
  })
  .addFilter('rollbackRCM', function(){
    return through2.call(this, function(ticket){
      var events = JSON.parse(ticket.events);
      //no need to process tickets opened AFTER the maxdate
      if(+new Date(ticket.dtOpened) > maxdate ){ console.log(ticket.ixBug + ": " + ticket.dtOpened + " greater than maxdate, skipping"); return }
        var len = events.length,
        n = events.length,
        justafterRCM;
      //make sure there ARE events, and iterate through each
      while( len && --n >= -1){
        if( n == -1 ){
          //we're at the final event, but no RCM!  so must use our previously captured RCM (from the "from" in the event just after maxdate)
          if(justafterRCM){
            console.log(ticket.ixBug + ": JUSTAFTER: unwinding RCM to '"+justafterRCM+"'");
            // roll 'er back!
            ticket.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65 = justafterRCM;        
          }
          break;
        }
        var event = events[n];
        if( !event || typeof event.sChanges !== "string") continue;
        // capture milestone references name
        var milestone = event.sChanges.match(reg);  
        if( !milestone || !milestone.length ) continue;
        //if the earliest RCM event is AFTER maxdate, we must capture the original now
        if( +new Date(event.dt) > maxdate ){          
          //from the "from". NOTE: reference bug 50318 at date 2012-10-01 as an example
          justafterRCM = milestone[1] || '';    
        } else {          
          //in this block the event date occured is BEFORE the maxdate
          //for debugging, let you know if this event invalidates a more recent RCM event because of maxdate  
          var inv = (justafterRCM) ? "justafter invalidated!" : ""; 
          // some feedback for ya
          console.log(ticket.ixBug + ":  " + event.dt + " unwinding RCM to '"+milestone[2]+"' "+inv); 
          // roll 'er back!
          ticket.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65 = milestone[2] || '';
          break;
        }
      }
      this.emit("data", ticket);
    });
  })
  .addFilter( 'milestones', function(options){
    return through2.call(this, function(mile){
      if(mile.sFixFor.toLowerCase() === "undecided" || mile.ixFixFor == 1){
          mile.ixProject = options.project.ixProject;
          mile.sProject = options.project.sProject;
          mile.ixFixFor = mile.ixProject + "00000";
      }
      mile.dt = +new Date(mile.dt) || 0;
      mile.dtStart = +new Date(mile.dtStart) || 0;
      this.emit("data", mile)
    })
  });
}

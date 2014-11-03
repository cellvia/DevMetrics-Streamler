module.exports = function(streamler){

var through2 = streamler.through2;

streamler
  .addFilter( 'repos', function(){ 
    return through2.call(this, function(data){
      this.emit("data", data);
    });
  })
  .addFilter( 'changesets', function(){
    return through2.call(this, function(data){
      //console.log("filterCs");
      //filter the changesets if you want//
      //if(data.errors){console.log(util.inspect(data.errors)); return; }
      this.emit("data", data);
    });
  })
  .addFilter( 'branchDiffHeaders', function(){ 
    return through2.call(this, function (data) {
      //debug && console.log("prepheaders"+data);
      if( typeof data === "string" && data !== "Binary file" && data !== "Image file" ) {
        this.emit("data", { header: data });
      } else {
        this.emit("data", {});
      }
    });
  })
  .addFilter( 'locProcess', function(){ 
    return through2.call(this, function (data){
      //debug && console.log("locProcess"+data);
      if(data.header) {
        var d = data.header.split(","),
          e = d[2].split(" "),
          g = d[1].split(" ");    
        data.locAdded = parseInt(e[0]) || 0;
        data.locRemoved = parseInt(g[0]) || 0;  
      }else{
        data.locAdded = 0;
        data.locRemoved = 0;  
      }
      this.emit("data", data ); 
    });
  })
  .addFilter( 'changesetRecombine', function (){
    return through2.call(this, function(data){
      //debug && console.log("recombine"+data);
      if(!data){
        this.emit("data", this.root.changeset); 
        return 
      };
      for (var attr in data) {
        switch( attr ){
          case "locAdded":
          case "locRemoved":
            if( !this.root.changeset[attr] ) this.root.changeset[attr] = 0;
            this.root.changeset[attr] += parseInt(data[attr]);
          break;
          case "header":
            continue
          break;
          default:
            this.root.changeset[attr] = data[attr];
          break;
        }
      }
      this.emit("data", root.changeset);
    }, function(){this.emit("end", this.root);} );
  });

}

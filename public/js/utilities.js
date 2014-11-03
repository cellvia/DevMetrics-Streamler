
Utilities = function(){
}

Utilities.sum = function(o) {
    var properties = Object.keys(o)
    ,sum =0;
    properties.forEach(function(property){
            sum += +o[property];
    });
    return sum;
}

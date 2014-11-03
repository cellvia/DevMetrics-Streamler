'use strict';
var util = require('util');
var escapeeReport = require('./escapee');
var builder = require('msexcel-builder');

function getTimestamp(){
    var x = new Date();
    var p = [x.getFullYear(),pad(x.getMonth()+1,2), pad(x.getDate())].join("_"); 
    var q = [pad(x.getHours(),2), pad(x.getMinutes(),2), pad(x.getSeconds(),2), pad(x.getMilliseconds(),3)].join("");
    return (p+"_"+q);
}
function pad(number, totalDigits, padString){
    var exp = '';
    if (!padString)
        padString = '0';
    for(var i=0;i<=totalDigits; i++){
        exp += padString;
    }
    return (exp + number).slice(-totalDigits);
}

var generator = function(){	
    var fpath = "./downloads/escapeeReport/";
    var fname="SixMonthRollingEscapeReport";
    var timestamp = getTimestamp();    
    var filename = fname+"_"+timestamp+".xlsx";        
	var workbook = builder.createWorkbook(fpath, filename);
	var sheet = workbook.createSheet('sheet1', 1000, 1000);
	
	function writeData(arr, row, col, writeInRow, fillStyle,fontStyle,borderStyle,align){
			var i,j;		
			for (i=0, j=arr.length; i<j ;i++){
			    sheet.set(col,row,arr[i]);
				if(fillStyle) {sheet.fill(col,row,fillStyle);}
				if(fontStyle) {sheet.font(col,row,fontStyle);}
				if(borderStyle) {sheet.border(col,row,borderStyle);}
				if (align){sheet.align(col,row,align);}
				writeInRow? col++: row++;
			}							
		};	
	this.execute = function (year){
	    year = year||2013;
		escapeeReport.execute(new Date(year,0,1), new Date(year,11,31));		
		escapeeReport.on('complete', function(){					
		var rowN = 1;
		var colN = 1;	
		var hdr = ['Product'];
		var result = escapeeReport.results;	
		var months = escapeeReport.months;
		var fillStyles ={
			Header: {type:'solid',fgColor:'8',bgColor:'64'}
		};
		var fontStyles = {
			Header: {sz:'14',bold:false},
			SubHeader: {sz:'12',bold:true,iter: true}
		};
		var borderStyles = {
			Header: {bottom: 'medium'}
		};
		months.forEach(function(month){
			hdr.push(month);
			hdr.push('cnt');
		});
		hdr.push('');	
		hdr.push('Product');
		var monthsGroupedBySix= ['Jan-Jun', 'Feb-Jul','Mar-Aug','Apr-Sep','May-Oct','Jun-Nov','Jul-Dec'];
		monthsGroupedBySix.forEach(function(month){
            hdr.push(month + "["+year+"]");
            hdr.push('cnt');
        });
				
		result.forEach(function (obj){
			colN=1;			
			writeData(hdr,rowN,colN,true,{},fontStyles.Header, borderStyles.Header,'center');		
			rowN = rowN + 1;
			writeData([obj.pname],rowN,colN,true,{},fontStyles.SubHeader);
			rowN = rowN + 1;
			colN = 2;							
			var max = 0,i,j,ii,jj; 
			months.forEach(function(month){
				if (obj.items[month]){
					var monthlyData = obj.items[month];
					var milestones = Object.keys(monthlyData).sort();
					var dataCount = [];
					var sum=0;
					for(i=0, j=milestones.length; i<j; i++){
						dataCount[i] = monthlyData[milestones[i]];
						sum += dataCount[i];
					}
					writeData([sum],rowN-1,colN+1,false,{},fontStyles.SubHeader,{},'right');	
					writeData(milestones,rowN,colN++,false);
					writeData(dataCount,rowN,colN++,false,{},{},{},'right');
					if (max<milestones.length)
						max = milestones.length;					
				}else{ console.log('Did not find data for month '+ month);}
			});
			colN++;
			writeData([obj.pname],rowN,colN,true,{},fontStyles.SubHeader);
			colN++;
			
			var compos = {};
			for(ii=0; ii<7; ii++){
			    compos={};
			    smm=0;
			    for(jj=ii; jj<ii+6; jj++){
			        var month = months[jj];
			        var monthlyData = obj.items[month];
                    var mss = Object.keys(monthlyData).sort();
                    
                    for(i=0, j=mss.length; i<j; i++){
                        if (compos.hasOwnProperty(mss[i])){
                            compos[mss[i]] += monthlyData[mss[i]];
                        }else{
                            compos[mss[i]] = monthlyData[mss[i]];
                        }                
                                                      
                    }
			    }
			    
			    var composMs = Object.keys(compos).sort();
			    var composD = [];
			    var smm = 0;
			    composMs.forEach(function(ms){
			        composD.push(compos[ms]);
			        smm += compos[ms];
			    });
			    writeData([smm],rowN-1,colN+1,false,{},fontStyles.SubHeader,{},'right');
			    writeData(composMs,rowN,colN++,false);
                writeData(composD,rowN,colN++,false,{},{},{},'right');
			    if (max<composMs.length)
                        max = composMs.length;
			    
			}						
			rowN = rowN + max +1;		
		});	
		//console.log('Writing file...');
		workbook.save(function(err,path){
	    	if (err){
	    		console.log("error occured!");
	    		throw new Error(err);
	    	}else{
	    		console.log('File created:'+path);
	    	}  
	    });	
		});
	};
};

module.exports = new generator();
//var xlgenerator = new generator();
//xlgenerator.execute();
//getTimestamp();

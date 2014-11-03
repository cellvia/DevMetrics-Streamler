
module.exports = {
    caseColumns: function(req, res) {
        var format = req.param('format', 'json');

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }
        models.Case.getCaseColumns(function(err, cols) {
            res.json(cols);
        });        
    }
}
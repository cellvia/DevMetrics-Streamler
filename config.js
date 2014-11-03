
module.exports = function(app, express) {	
	app.configure(function(){
		app.set('views', __dirname + '/views');
		app.set('view engine', 'jade');
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(express.cookieParser());
		app.use(express.session({ secret: '706c4e409b8411e1a8b00800200c9a66' }));
		app.use(app.router);
		app.use(express.static(__dirname + '/public'));
		app.set('view options', { layout: false });
	});

	app.configure('development', function(){
		app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
		app.set('view options', { layout: false, pretty: true });
	});

	app.configure('production', function(){
		app.use(express.errorHandler());
	});
	
	return app;
};
var keystone = require('keystone')
	async = require('async');

exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res),
		locals = res.locals;
	
	// locals.section is used to set the currently selected
	// item in the header navigation.
	locals.section = 'home';

	locals.data = {
		tags: []
	};

	// Load stories	
	view.on('init', function(next) {
		keystone.list('Story').model.findOne({frontpageStory:true}).sort('submitDate').exec(function(err, story) {
			locals.data.frontpageStory=story;
			next(err);
		});
	});

	// Load stories	
	view.on('init', function(next) {
		keystone.list('Story').model.find({state:'published'}).sort('order submitDate').limit(20).exec(function(err, stories) {
			locals.data.stories=stories;
			locals.data.storiesJson=JSON.stringify(locals.data.stories);
			next(err);
		});
	});

	// Load pages
	view.on('init', function(next) {
		keystone.list('Page').model.find().exec(function(err, pages) {
			locals.data.pagesJson=JSON.stringify(pages);
			next(err);
		});
	});

	//Load specific story (for SEO and FB deeplinking)
	view.on('init', function(next) {
		keystone.list('Story').model.findOne({'_id':req.params.storyId}).exec(function(err, story) {
			locals.data.singleStory=story;
			next(err);
		});
	});

	// Load all categories
	view.on('init', function(next) {
		
		keystone.list('StoryTag').model.find({showAsDefault:true}).sort('name').exec(function(err, results) {
			
			if (err || !results.length) {
				return next(err);
			}
			
			// Load the counts for each category
			async.each(results, function(tag, next) {

				keystone.list('Story').model.count().where('tags').in([tag.id]).where('state').equals('published').exec(function(err, count) {
					tag.assetCount = count;
					var newTag = {
						'_id':tag._id,
						'key':tag.key,
						'name':tag.name,
						'storyCount':count
					};
					locals.data.tags.push(newTag);
					next(err);
				});

				
			}, function(err) {
				next(err);

				locals.data.tagsJson=JSON.stringify(locals.data.tags);
			});
			
			
		});
		
	});
	
	// Render the view
	view.render('index');
	
};

define([
		// Application
		"app",

		//Views
		"views/tell-your-story",
		"views/grid",
		"views/story",
		"views/text-page",

		//Models + Collections
		"models/story",
		"collections/tags",
		"collections/stories",
		"collections/pages",

		"cloudinary",
		"modal"
	],

	function(
		app,
		TellYourStoryView,
		GridView,
		StoryView,
		TextPage,
		StoryModel,
		TagsCollection,
		StoriesCollection,
		PagesCollection
		) {
		// Defining the application router, you can attach sub routers here.
		var Router = Backbone.Router.extend({
			modalOpen: false,

			frontpageStoryLoaded: false,

			routes: {
				"": "index",
				"story/:storyId": "story",
				"om" : "openOm",
				"regler" : "openRegler",
				"hvem" : "openHvem"
			},

			initialize: function() {
				var self = this;

				console.log('init');

				//Init cloudinary
				$.cloudinary.config({ cloud_name: 'diin', api_key: '967225847829495'});

				//Set tags-collection
				self.tagsCollection = new TagsCollection(window.app.tags);
				self.storiesCollection = new StoriesCollection(window.app.stories);
				self.pagesCollection = new PagesCollection(window.app.pages);

				//Story view
				$.modal({
					cloning:false,
					closeOnEsc:false,
					onBeforeClose: function() {
						app.router.navigate('/', {trigger: true});
						return true;
					}
				});

				//Set standard layout
				app.useLayout("app").setViews({
					".grid": new GridView({tags:self.tagsCollection,stories:self.storiesCollection})
				}).render(function() {
					Backbone.history.start({ pushState: true, root: app.root });
				});

				//Trigger to open tell your story modal
				app.on('modal:tellyourstory', this.openTellYourStory, this);
				app.on('modal:close', this.closeModal, this);
			},

			loadFrontpageStory: function (argument) {
				var self = this;
				if ( ! this.frontpageStoryLoaded ) {
					this.frontpageStoryLoaded=true;

					var frontpageStoryId = $('.frontpage-story').data('id');

					//Make sure story opens correctly
					$('.frontpage-story a').on('click', function (e) {
						e.preventDefault();
						app.router.navigate('story/'+frontpageStoryId, {trigger: true});
					});

					//Get share/comments count
					var frontpageStoryModel = new StoryModel({'_id':frontpageStoryId});
					frontpageStoryModel.on('fetched:socialCount', function() {
						$('.frontpage-story').find('.fb-comment-count').text(frontpageStoryModel.get('commentCount'));
						$('.frontpage-story').find('.fb-likes').text(frontpageStoryModel.get('shareCount'));
					}, this);
					frontpageStoryModel.getShareCount();

					$('.frontpage-story .share-btn').click(function(e) {
						e.preventDefault();
						var self = this;
						ga('send', 'event', 'button', 'click', 'shareStoryInit', frontpageStoryModel.get('_id'));
						FB.ui({
							method: 'share',
							href: 'http://debat.100aaret.dk/story/'+frontpageStoryModel.get('_id')
						}, function(response){
							if (response && !response.error_code) {
								ga('send', 'event', 'button', 'click', 'shareStoryDone', frontpageStoryModel.get('_id'));
							} else {
								ga('send', 'event', 'button', 'click', 'shareStoryFailed', frontpageStoryModel.get('_id'));
							}
						});
					});
				}
			},

			index: function() {
				console.log('index');

				$('#modal').modal().close();
				this.modalOpen=false;
			
				this.loadFrontpageStory();
			},

			closeModal: function() {
				$('#modal').modal().close();
			},

			story: function(storyId) {
				var self = this;

				ga('send', 'pageview', '/story/'+storyId);

				if ( ! self.storiesCollection.get(storyId) ) {
					var fetchedStory = new StoryModel({'_id':storyId});
					fetchedStory.fetch({
						success:function(a1,a2,a3) {
							console.log(a1);
							console.log(a2);
							console.log(a3);
							self.openStory(storyId, fetchedStory);
						}
					});
				} else {
					self.openStory(storyId, null);
				}
			},

			openStory: function (storyId, fetchedStory) {
				var self = this;

				if ( ! this.modalOpen ) {
					self.storyView = new StoryView({collection:self.storiesCollection, storyId:storyId, fetchedStory:fetchedStory});

					$('#layout').append('<div class="modal" id="modal" style="display:none"></div>');

					app.layout.setView(
						'#modal', self.storyView
					).render(function() {
						$('#modal').modal().open();
						self.modalOpen=true;
					});

				} else {
					//handle change in modal focus
					self.storyView.setStory(storyId);
				}
			},

			openTellYourStory: function (argument) {
				$('#modal').modal().close();
				this.modalOpen=false;

				ga('send', 'pageview', '/tellyourstory/');

				$('#layout').append('<div class="modal" id="modal" style="display:none"></div>');

				app.layout.setView(
					'#modal', new TellYourStoryView({collection:this.tagsCollection})
				).render(function() {
					$('#modal').modal().open();
					self.modalOpen=true;
				});
			},

			openOm: function () {
				var self = this;
				$('#modal').modal().close();
				this.modalOpen=false;

				ga('send', 'pageview', '/om/');

				$('#layout').append('<div class="modal" id="modal" style="display:none"></div>');

				app.layout.setView(
					'#modal', new TextPage({model:self.pagesCollection.get('om')})
				).render(function() {
					$('#modal').modal().open();
					self.modalOpen=true;
				});
			},

			openRegler: function () {
				var self = this;
				$('#modal').modal().close();
				this.modalOpen=false;

				ga('send', 'pageview', '/regler/');

				$('#layout').append('<div class="modal" id="modal" style="display:none"></div>');

				app.layout.setView(
					'#modal', new TextPage({model:self.pagesCollection.get('regler')})
				).render(function() {
					$('#modal').modal().open();
					self.modalOpen=true;
				});
			},

			openHvem: function () {
				var self = this;
				$('#modal').modal().close();
				this.modalOpen=false;

				ga('send', 'pageview', '/regler/');

				$('#layout').append('<div class="modal" id="modal" style="display:none"></div>');

				app.layout.setView(
					'#modal', new TextPage({model:self.pagesCollection.get('hvem')})
				).render(function() {
					$('#modal').modal().open();
					self.modalOpen=true;
				});
			}
		});

		return Router;
	}
);
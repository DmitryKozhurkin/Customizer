$.widget("ui.sexyslider", {
	options: {
		width: '100%',
		height: '100%',
		ratio: 0.5,
		changeTime: 114000,
		aminTime: 700,
	},
	_create: function() {
		var self = this;

		self.queue = [];

		self.element.css({ 'width': this.options.width })
		self.calcHeight();
		$(window).resize(self.calcHeight.bind(self))

		self.slides = self.element.children('div.slide');

		$('<div>',{class:'pause'}).appendTo(self.element)
		$('<div>',{class:'nav left'}).appendTo(self.element)
		.click(function(){
			self.next(-1)
		})
		$('<div>',{class:'nav right'}).appendTo(self.element).click(function(){
			self.next(1)
		})

		self.controls = $('<ol>',{class:'controls'}).appendTo(self.element)

		self.slides.each(function(i,elem){
			$(elem).css({
				'position': 'absolute',
				'top': '0px',
				'left': '0px',
			})
			.data('no',i)
			.find('img').load(function(){
				$(this).data('loaded',true)
			})

			var page = $('<li>').text(+i+1).appendTo(self.controls)
			.click(function(){
				var target = $(this).index()-$(self.slides[0]).data('no');
				self.next(target)
			})
		})
		self.setZindex();
		self.glowPage(0);

		self.startSlideshow()

	},
	next: function(target,delim) {
		//alert(target)
		var self = this;

		if (target==0) return 
		if (self.isAnim) {
			self.queue.push(target)
			return
		}

		self.element.find('.pause').hide('fade','fast')
		self.slides.hide()
		self.stopSlideshow()
		self.isAnim = true;

		var speed = this.options.aminTime/(delim||1);
		var effect = delim ? 'linear' : 'easeOutCubic';
		var dests = ['left','right'];

		if (target>0) {
			var skip_slides = [].splice.call(self.slides,0,target);
			var curr_slide = skip_slides[0];
			var next_slide = self.slides[0];
			[].push.apply(self.slides,skip_slides);
		} else {
			var skip_slides = [].splice.call(self.slides,target);
			var curr_slide = self.slides[0];
			var next_slide = skip_slides[0];
			[].unshift.apply(self.slides,skip_slides);
			dests.reverse();
		}

		self.setZindex();

		$(curr_slide).show()
		if (skip_slides.length==1) {
			$(curr_slide).hide('slide', {
				duration: speed,
				direction: dests[0],
				easing: effect
			})
		}
		$(next_slide).hide().show('slide', {
			duration: speed,
			direction: dests[1],
			easing: effect
		}, function(){
			self.isAnim = false
			/*var q = self.queue.pop()
			if (q) {
				self.next(q,delim||self.queue.length+2)
				return
			}*/
			self.startSlideshow()	
		})

		self.glowPage($(next_slide).data('no'));

	},
	glowPage: function(index){
		this.controls.find('li').removeClass('flex-active')
		.eq(index).addClass('flex-active')
	},
	calcHeight: function(){
		this.element.height(this.options.ratio ? this.element.width()*this.options.ratio : this.options.height)
	},
	setZindex: function(){
		this.slides.each(function(i,elem){
			$(elem).css({
				'z-index': 100-i
			})
		})
	},
	startSlideshow: function(delay){
		var self = this;
		self.stopSlideshow()
		self.timeout = setTimeout(function(){
			if ($('.sexyslider:hover').length) {
				self.element.find('.pause').show('fade','slow')
				self.startSlideshow(500)
			} else {
				self.next(1)
			}
		},
		delay||self.options.changeTime)
	},
	stopSlideshow: function(){
		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = null;
	},
	_destroy: function() {
		
	}
})
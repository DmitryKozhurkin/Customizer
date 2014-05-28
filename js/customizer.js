$.widget("ui.customizer", {
	options: {
		type: 't-shirt',
		color: 'white',
		max_prints: 99,
	},
	colors: {
		't-shirt': {
			white: { name: 'белый', value:'#fff' },
			grey: { name: 'серый', value:'#cbcfcb' },
			black: { name: 'черный', value:'#000' },
			bone: { name: 'слоновая кость', value:'#fff2c4' },
			orange: { name: 'оранжевый', value:'#eb6d12' },
			yellow: { name: 'желтый', value:'#ffd602' },
			lemon: { name: 'лимонный', value:'#f8ee06' },
			azure: { name: 'небесный', value:'#75cfea' },
			blue: { name: 'голубой', value:'#00b2dc' },
			navy: { name: 'синий', value:'#0b5394' },
			green: { name: 'зеленый', value:'#118649' },
			salat: { name: 'салатовый', value:'#92c83e' },
			red: { name: 'красный', value:'#b40728' },
			coffee: { name: 'кофейный', value:'#543019' },
			purple: { name: 'фиолетовый', value:'#7f3f98' }
		},
		'hoodie': {
			grey: '#000',
			black: '#f90'
		}
	},
	layers: [
		{
			id: 'front',
			title: 'спереди',
		},
		{
			id: 'back',
			title: 'сзади'
		}
	],
	cachedSVG: {},
	minPrintSide: 20,
	_create: function() {

	},
	clear: function(){
		$('.customizer-widget').hide()
	},
	reload: function(o){
		var self = this;

		self.clear();

		self.current_prints = [];

		self.snapshot = new LocStore('sexycustomizer');
		self.snapshot.addFilter(self.setIdTextarea.bind(self));

		self.basket_hack = window.basket_hack;

		//console.log('self.options',JSON.stringify(self.options))
		//console.log('o',JSON.stringify(o))

		$.extend(self.options,o);

		//console.log('self.basket_hack',JSON.stringify(self.basket_hack))
		//console.log('self.snapshot',JSON.stringify(self.snapshot.get('options',self.options.type)))

		self.merged_options = $.extend(
			self.options,
			self.basket_hack ? self.basket_hack[self.options.type] : self.snapshot.get('options',self.options.type)
		)

		self.options_store = new LocStore(JSON.parse(JSON.stringify(self.merged_options)));

		self.setCountSelect()

		//////////////////////////////////////////////////////////////////////////// GUI

		var elem = this.elem = self.element.find('.ecwid-productBrowser-details-thumbnail');

		$('.ecwid-productBrowser-details-optionPanel-select').first().hide()
		$('.ecwid-productBrowser-details-optionPanel-textarea').first().hide()

		var widget = this.widget = $('<div>',{id:'customizer-widget', class:'customizer-widget'})
		.appendTo($('.container-narrow'))
		.hide()

		var loader = $('<div>',{class:'customizer__loader'}).appendTo(widget)

		self.allocateWidget(); // Позиционирование и размеры виджета

		self.resizeEventOn(); // Обработчик на изменение размеров окна

		//********** Слой с изображениями
		var scene = this.scene = $('<div>', {class:'customizer__scene'})
		.appendTo(widget).hide()

		//********** Место для принта
		var area = this.area = $('<div>', {class:'customizer__scene__area'})
		.appendTo(scene)
		.disableSelection()

		$('<div>', {class:'customizer__scene__area__border'}).appendTo(area)

		var collar = this.collar = $('<div>', {class:'customizer__scene__collar'})
		.append('<div>')
		.appendTo(scene)

		// Переключатель слоев
		var switcher = this.switcher = $('<div>', {class:'customizer__switcher'})
		.appendTo(widget)

		self.loaded_layers = {};
		
		$.each(self.layers, function(key, val){

			var img = self['img_'+val.id] = $('<img>',{class:'customizer__scene__image', src:'./i/'+self.options.type+'_'+val.id+'.png'})
			.appendTo(scene).hide()
			.load(function(){
				//setTimeout(function(){
				loader.hide()
				switcher.children('.customizer__switcher__view--'+val.id).show()
				.find('img').attr('src',$(this).attr('src'))
				scene.show()
				if (key==0) self.showLayer(self.layers[0].id)
				//self.loaded_layers[val.id] = true;
				//},2000)
			})
			$('<div>',{class:'customizer__switcher__view customizer__switcher__view--'+val.id, title:val.title})
			.append('<span>0</span>').append('<img>').hide()
			.appendTo(switcher).click(self.showLayer.bind(self, val.id))
			self.countLayerPrints(val.id)
		})
		

		//////////////////////////////////////////////////////////////////////

		//********** Элементы управления
		var controls = this.controls = $('<div>', {class:'customizer__controls'})
		.appendTo(widget)

		//********** Выбор цвета
		var color_picker = $('<div>',{class:'customizer__colorPicker'})
		.appendTo(controls)

		$.each(self.colors[self.options.type], function(key,val){
			var color_value = $('<div>',{class:'customizer__colorPicker__color'})
			.css('background-color', val.value)
			.attr('title',val.name)
			.appendTo(color_picker)
			.click(function(){
				color_picker.children('.customizer__colorPicker__color').removeClass('customizer__colorPicker__color--selected')

				$(this).addClass('customizer__colorPicker__color--selected')
				scene.css({ 'background-color': val.value })
				collar.find('div').css({ 'background-color': val.value })
				self.switcher.children('div').css({ 'background-color': val.value })
				self.snapshot.save('options',self.options.type,'color', key);
			})
			if (self.options.color==key) color_value.click();
		})

		//********** Выбор принта
		self.list_prints_loaded = false
		var prints = $('<button>', {class: 'btn customizer__controls__btn', text: 'Принты'})
		.prop('disabled',true)
		.css({'margin-top':'10px'})
		.appendTo(controls)
		.click(function(){
			self.print_popup.toggle(/*'fade',100*/).focus()
			if (!self.list_prints_loaded) {
				self.redrawMinipics()
				self.list_prints_loaded = true
			}
		})

		if (!self.print_list) self.getPtintPaths(function(data){
			self.print_list = data
			prints.prop('disabled',false)
		})
		else prints.prop('disabled',false)

		self.initPrintsPopup() // отрисовка окна с принтами

		$('<br>').appendTo(controls);

		//********** Режим просмотра
		var preview = $('<button>', {class: 'btn customizer__controls__btn', text: 'Просмотр'})
		.appendTo(controls)
		.click((function(){
			var z = ['removeClass','addClass']
			return function(){
				scene[z.reverse()[0]]('customizer__scene--preview')
			}
		})())

		$('<br>').appendTo(controls);

		var color_replacer = self.color_replacer = $('<div>',{class:'customizer__colorReplacer'})
		.appendTo(controls)

		self.initPalette() // отрисовка палитры с цветами
		
		$('<br>').appendTo(controls);

		var toMiddleBtn = $('<button>', {class: 'btn'})
		.append('<i class="icon icon-align-center"></i>')
		.appendTo(controls)
		.mousedown(function(){
			var wrapper = $('.customizer__wrapper:focus');
			self.toX(wrapper);
			self.toY(wrapper);
			self.snapPrints();
		})
		.hide()

		widget.show('fade',300)
		console.log(1111111111111,this)
	},
	resizeEventOn: function(){
		return;
		var self = this;
		$(window).resize(function(){
			self.allocateWidget();
			self.redrawPrints();
		})
	},
	resizeEventOff: function(){
		return;
		$(window).unbind('resize')
	},
	getPtintPaths: function(cb){
		$.get('./prints.json',function(data,status,xhr){
			if (cb) cb(data)
		}).fail(function(e){
			alert('ошибка загрузки принтов')
			console.log('ошибка загрузки принтов',e)
			if (cb) cb({})
		})
	},
	initPrintsPopup: function(){
		var self = this;
		var print_popup = this.print_popup = $('<div>', {class:'customizer__printPopup'})
		.hide()
		.attr('tabindex',100)
		.appendTo(self.widget)
		.keyup(function(e){
			if(e.keyCode==27) {
				e.preventDefault();
				popup_close.click();
			}
		})

		var popup_close = this.popup_close = $('<img>',{class:'customizer__printPopup__close', src: './i/popup_close.png'})
		.appendTo(print_popup)
		.click(function(){
			self.print_popup.toggle(/*'fade',100*/);
		})

		var loader = $('<div>',{class:'input-append',width:'100%'}).appendTo(print_popup);
		var loader_input = $('<input>',{type:'text'}).appendTo(loader);
		var loader_submit = $('<button>',{class: 'btn',text:'загрузить'}).appendTo(loader);

		loader_submit.click(function(){
			var val = loader_input.val();
			if (val) {
				var minipic = self.addMiniPic(val,loaded_imgs,true).find('img')
				.load(function(){
					self.loaded_prints.push(val);
					self.loaded_prints = self.loaded_prints.slice(-10);
					self.snapshot.save('loaded_prints',self.loaded_prints);
				})
				.data('index',self.loaded_prints.length)
				loader_input.val('')
			}
		})
		
		var loaded_imgs = $('<div>',{class:'customizer__printPopup__container customizer__printPopup__container--loaded'})
		.appendTo(print_popup);

		self.loaded_prints = self.snapshot.get('loaded_prints')||[];
		$.each(self.loaded_prints,function(key,val){
			self.addMiniPic(val,loaded_imgs,true).data('index',key)
		})

		$('<hr>').css({'margin-top':'10px'}).appendTo(print_popup);

		var default_imgs = self.default_imgs = $('<div>',{class:'customizer__printPopup__container customizer__printPopup__container--default'})
		.appendTo(print_popup);

	},
	redrawMinipics: function(){
		var self = this;
		$.each(self.print_list, function(key,val){
			$.each(val, function(key,val){
				self.addMiniPic(val,self.default_imgs)
			})
		})
	},
	addMiniPic: function(val,to,loaded){
		var self = this;
		var minipic_wrapdiv = $('<div>',{class: 'customizer__printPopup__miniprint'}).prependTo(to)
		var minipic = $('<img>').appendTo(minipic_wrapdiv) //TODO зафиксировать размер
		.click(function(){
			self.popup_close.click();
			self.addPrint(val)
		})
		.error(function(){
			minipic_wrapdiv.remove();
		})
		self.setSRC(minipic,val);
		if (loaded) {
			$('<div>').appendTo(minipic_wrapdiv)
			.click(function(){
				var wrapdiv = $(this).parent();
				self.loaded_prints.splice(wrapdiv.data('index'),1)
				wrapdiv.remove()
				self.snapshot.save('loaded_prints',self.loaded_prints);
			})
		} 
		return minipic_wrapdiv;
	},
	redrawPrints: function(id){
		var self = this;
		$('.customizer__wrapper').remove();
		self.current_prints = [];
		console.log('______redrawPrints',id,self.options_store.data)
		$.each(self.options_store.get('prints', id)||[],function(key,val){
			self.addPrint(val, true)
		})
	},
	addPrint: function(val, redraw){

		var self = this;

		if (self.countPrints()>=self.options.max_prints) return alert('Максимальное количество принтов:'+self.options.max_prints)

		var val = typeof(val)=='string' ? {src:val} : val;

		var index = self.current_prints.length;
		var wrapper = $('<div>', {class:'customizer__wrapper'})
		.attr('tabindex',100)
		.css({'z-index':100+index})
		.appendTo(self.area)
		.disableSelection()
		.addClass('customizer__wrapper--loading')

		var move_timeout = null;
		$.each([
			{ name:'moveLeft', value:['left',-1] },
			{ name:'moveRight', value:['left',1] },
			{ name:'moveTop', value:['top',-1] },
			{ name:'moveBottom', value:['top',1] }
		], function(key,val){
			var mover = $('<div>', {class:'customizer__wrapper__edit customizer__wrapper__edit--'+val.name}).appendTo(wrapper)
			mover.mousedown((function(value){
				return  function(){
					var wrapper = $(this).parent();
					var res = wrapper.offset();
					res[value[0]] += value[1];
					var containment = wrapper.draggable('option','containment')
					if (self.checkCoordInArea(res,containment)) {
						wrapper.offset(res);
					}
					self.setResizeArea(wrapper.find('.customizer__wrapper__print'))
					self.snapPrints();
				}
			})(val.value))
			.dblclick(function(e){
				e.preventDefault();
				$(this).mousedown()
			})
		})

		$.each([
			{ name:'zoomIn', value:1, title:'увеличить' },
			{ name:'zoomOut', value:-1, title:'уменьшить' },
		], function(key,val){
			$('<div>', {class:'customizer__wrapper__edit customizer__wrapper__edit--'+val.name, title:val.title}).appendTo(wrapper)
			.mousedown((function(value){
				return function(){
					var print = wrapper.find('.customizer__wrapper__print');
					var pre_width = print.width();
					var new_width = print.width()+value;
					print.width(new_width)
					var new_height = print.height()
					if (new_width<self.minPrintSide || new_height<self.minPrintSide ||
						new_width>(self.area.offset().left+self.area.width()-wrapper.offset().left) ||
						new_height>(self.area.offset().top+self.area.height()-wrapper.offset().top)) {
						print.width(pre_width)
					}
					print.css('height','auto');
					self.setDrageArea(wrapper);
					self.snapPrints();
				}
			})(val.value))
			.dblclick(function(e){
				e.preventDefault();
				$(this).mousedown()
			})
		})

		$('<div>', {class:'customizer__wrapper__edit customizer__wrapper__edit--alignCenter',title:'по центру'}).appendTo(wrapper)
		.mousedown(function(){
			self.toX(wrapper);
			self.toY(wrapper);
			self.snapPrints();
		})

		$('<div>', {class:'customizer__wrapper__edit customizer__wrapper__edit--toBehind',title:'опустить слой'}).appendTo(wrapper)
		.mousedown(function(){
			self.toggleWrappers(wrapper,-1);
			self.snapPrints();
		})

		$('<div>', {class:'customizer__wrapper__edit customizer__wrapper__edit--remove', title:'удалить'}).appendTo(wrapper)
		.mousedown(function(value){
			//delete self.current_prints[self.indexOf(self.current_prints, wrapper)]
			self.current_prints.splice(self.indexOf(self.current_prints, wrapper),1)
			wrapper.draggable('destroy').find('.customizer__wrapper__print').resizable('destroy')
			wrapper.remove()
			self.snapPrints();
			self.drawColorReplacer()
		})

		var print = $('<div>',{class: 'customizer__wrapper__print'})
		.width(self.area.width()*(val.width||0.5))
		.appendTo(wrapper)
		.resizable({
			aspectRatio: true,
			handles: 'se',
			minWidth: self.minPrintSide,
			minHeight: self.minPrintSide,
			//containment: self.area,
			//autoHide: true,
			start: function(){
				self.resizeEventOff();
			},
			stop: function(){
				self.setDrageArea(wrapper);
				self.snapPrints();
				self.resizeEventOn();
			}
		})

		var print_img = $('<img>', {class:'customizer__wrapper__print__image', width:'100%'})//.css({'max-width':'100%'}))
		.appendTo(print)
		.one('load',function(){
			wrapper.removeClass('customizer__wrapper--loading')

			self.toX(wrapper,val.left)
			self.toY(wrapper,val.top)

			self.setResizeArea(print)
			self.setDrageArea(wrapper)

			self.snapPrints();
		})
		.load(function(){
			if (!redraw) wrapper.mousedown()
		})
		.data('src',val.src)
		.data('colors',val.colors)

		self.setSRC(print_img,val.src,true)

		wrapper
		.draggable({
			handle: '.customizer__wrapper__print',
			stop: function(){
				self.setResizeArea(wrapper.find('.customizer__wrapper__print'))
				self.snapPrints();
			}
		})
		.keydown(function(e){
			e.stopImmediatePropagation();
			if(e.altKey) {
				if (e.keyCode==40) {
					e.preventDefault();
					self.toggleWrappers(wrapper,-1);
					self.snapPrints();
				} else if (e.keyCode==38) {
					e.preventDefault();
					self.toggleWrappers(wrapper,1);
					self.snapPrints();
				}
				return
			}
			if(e.keyCode==46) { // DELETE
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--remove').mousedown()
			} else if (e.keyCode==39) {
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--moveRight').mousedown()
			} else if (e.keyCode==37) {
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--moveLeft').mousedown()
			} else if (e.keyCode==38) {
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--moveTop').mousedown()
			} else if (e.keyCode==40) {
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--moveBottom').mousedown()
			} else if (e.keyCode==187) {
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--zoomIn').mousedown()
			} else if (e.keyCode==189) {
				e.preventDefault();
				wrapper.find('.customizer__wrapper__edit--zoomOut').mousedown()
			}
		})
		.mousedown(function(){
			$(this).focus()
		})
		.focus(function(e){
			e.stopImmediatePropagation()
			self.focused_print = print_img;
			self.drawColorReplacer(val.src)
		})

		self.toX(wrapper,val.left,true)
		self.toY(wrapper,val.top,true)

		self.current_prints.push(wrapper) // синхрон

	},
	initPalette: function(){
		var self = this;
		self.palette = $('<div>',{class:'customizer__palette'}).appendTo(self.widget)
		.hide()

		self.palette_select = $('<div>',{class:'customizer__palette__select'}).appendTo(self.palette)
		self.palette_input = $('<input>',{type:'text', class:'customizer__palette__input'}).appendTo(self.palette)
		self.palette.append('<br>')

		self.palette_select.farbtastic(self.palette_input)

		$('<button>', {class: 'btn', text: 'Отмена'}).appendTo(self.palette)
		.click(function(){
			self.palette.hide()
		})
		self.palette_ok = $('<button>', {class: 'btn btn-primary', text: 'Ок'}).appendTo(self.palette)
		
	},
	snapPrints: function(){
		var self = this;
		var res = _.map(self.current_prints, function(val,key){
			var res = {
				src: val.find('img.customizer__wrapper__print__image').data('src'),
				width: self.fixed(val.width()/self.area.width()),
				left: self.fixed((val.position().left)/self.area.width()),
				top: self.fixed((val.position().top)/self.area.height()),
			};
			var colors = val.find('.customizer__wrapper__print__image').data('colors')
			if (colors)
				res.colors = _.chain(colors)
				.map(function(val,key){ return { id: key, fill: val.fill, stroke: val.stroke } })
				.filter(function(val,key){
					return (val['fill'] && (val['fill'].orig!=val['fill'].change))
					|| (val['stroke'] && (val['stroke'].orig!=val['stroke'].change))
				})
				.map(function(val,key){
					return {
						id: val.id,
						fill: val['fill']&&val['fill'].change,
						stroke: val['stroke']&&val['stroke'].change
					}
				}).value()
			return res
		})
		
		self.options_store.set('prints', self.current_layer, res)
		self.snapshot.save('options',self.options.type, 'prints', self.current_layer, res);

		self.setCountSelect();
		self.countLayerPrints(self.current_layer)
		return res;
	},
	showLayer: function(id){
		var self = this;
		self.current_layer = id;
		self.widget.find('.customizer__scene__image').hide();
		self['img_'+id].show();
		self.switcher.children('.customizer__switcher__view').removeClass('customizer__switcher__view--selected')
		.filter('.customizer__switcher__view--'+id).addClass('customizer__switcher__view--selected')
		self.drawColorReplacer()
		if (!self.loaded_layers[id]) self.redrawPrints(id)
		self.collar.toggle(id=='front') // костыль
	},
	countLayerPrints: function(id){
		var self = this;
		self.switcher.children('.customizer__switcher__view--'+id)
		.children('span').text(self.options_store.get('prints',id,'length'))
	},
	countPrints: function(){
		var self = this;
		var cnt = 0;
		for (var i in self.layers) cnt += self.options_store.get('prints', self.layers[i].id,'length')|0;
		return cnt;
	},
	setCountSelect: function(){
		var self = this;
		var count = self.countPrints();
		var value = '';
		var select = $('div.ecwid-productBrowser-details-optionPanel-select').first()
		select.find('select option')
		.each(function(key,val){
			var data_arr = $(val).text().split('###');
			var range =  data_arr[1].split('/')
			if (count>=range[0] && (range[1]==undefined || count<=range[1])) {
				$(this).prop('selected',true);
				select.change()
				value = data_arr[0]+data_arr[2];
				return false;
			}
			//console.log(key,count,$(val).val(),range)
		})
		select.next().filter('.customizer-count-select').remove()
		select.after($('<p>',{class:'customizer-count-select'}).html('<b>Кол-во принтов:</b><br/>'+value))
	},
	setIdTextarea: function(data,next){
		var self = this;
		console.log('____SAVE',data)
		$('div.ecwid-productBrowser-details-optionPanel-textarea').first()
		.find('textarea').val(JSON.stringify(self.snapshot.get('options')))
		next()
	},
	setResizeArea: function(print){
		var self = this;
		var maxWidth = self.area.width()-(print.offset().left-self.area.offset().left);
		var maxHeight = self.area.height()-(print.offset().top-self.area.offset().top);
		print.resizable('option','maxWidth',maxWidth)
		print.resizable('option','maxHeight',maxHeight)
	},
	setDrageArea: function(wrapper){
		var pos = this.area.offset();
		var area = [
			pos.left,
			pos.top,
			pos.left+this.area.width()-wrapper.width(),
			pos.top+this.area.height()-wrapper.height()
		];
		wrapper.draggable('option','containment',area);
		return area;
	},
	checkCoordInArea: function(offset,containment){ // TODO
		if (offset.left>=containment[0] &&
			offset.left<=containment[2] &&
			offset.top>=containment[1] &&
			offset.top<=containment[3]) return true;
		else return false;
	},
	allocateWidget: function(){
		var w = $('.ecwid-productBrowser-details').width()-$('.ecwid-productBrowser-details-rightPanel').width();
		var h = w*0.66;
		this.widget
		.offset({top:this.elem.offset().top})
		.width(w)
		.height(h)
		this.elem.height(h)
		//.width(this.elem.width()||400)
		//.height(this.elem.height()||300)
	},
	toX: function(wrapper,left){
		var left = this.area.offset().left + (left!=undefined ? this.area.width()*left : (this.area.width()-wrapper.width())*0.5);
		wrapper.offset({
			left: left
		})
	},
	toY: function(wrapper,top){
		var top = this.area.offset().top + (top!=undefined ? this.area.height()*top : (this.area.height()-wrapper.height())*0.5);
		wrapper.offset({
			top: top
		})
	},
	getWrapperForToggle: function(index, way){
		var sub_layers = [];
		if (way==1) sub_layers = this.current_prints.slice(index+1)
		else if (way==-1) sub_layers = this.current_prints.slice(0, index)
		sub_layers[way==1 ? 'shift' : 'pop']()
		return way==1 ? this.current_prints.length-sub_layers.length-1 : sub_layers.length;
	},
	toggleWrappers: function(wrapper, way){
		var index = this.indexOf(this.current_prints, wrapper)
		var dest_index = this.getWrapperForToggle(index,way);
		var temp = this.current_prints[index];
		this.current_prints[index] = this.current_prints[dest_index]
		this.current_prints[dest_index] = temp;
		for (var i in this.current_prints){
			this.current_prints[i].css('z-index',+i+100)
		}
	},
	drawColorReplacer: function(src){
		var self = this;
		self.color_replacer.empty();
		if (!src) return
		if (!self.cachedSVG[src]) return
		var xml = self.cachedSVG[src].xml;
		var colors = self.focused_print.data('colors');
		//console.log('_____colors',colors)
		for (var i in colors) {
			for (var j in colors[i]) (function(i,j){

				var duet = $('<div>',{class:'customizer__colorReplacer__duet customizer__colorReplacer__duet--'+j})
				.appendTo(self.color_replacer)

				var before = $('<div>',{class:'customizer__colorReplacer__color'}).appendTo(duet)
				.css('background-color',colors[i][j].orig).attr('title','исходный цвет')
				.click(function(e){
					colors[i][j].change = colors[i][j].orig;
					self.focused_print.attr('src',self.xml2src(xml,colors))
					after.css('background-color',colors[i][j].orig)
					self.snapPrints()
				})

				var after = $('<div>',{class:'customizer__colorReplacer__color'}).appendTo(duet)
				.css({'background-color':colors[i][j].change}).attr('title','измененный цвет')
				.click(function(e){
					self.palette.show()
					self.palette_input.val(colors[i][j].change).keyup()
					self.palette_ok.unbind('click')
					.bind('click', function(){
						var new_color = self.palette_input.val();
						colors[i][j].change = new_color;
						self.focused_print.attr('src',self.xml2src(xml,colors))
						after.css('background-color',new_color)
						self.snapPrints()
						self.palette.hide()
					})
				})
			})(i,j)
		}
	},
	setSRC: function(img,src,isprint){
		var self = this;
		if (/\.svg(\?.+)?$/.test(src)) {
			if (isprint && self.cachedSVG[src]) {
				//console.log('FROM CACHE',src)
				img.attr('src',self.xml2src(self.cachedSVG[src].xml,self.mergeColors(img)))
			} else {
				$.get(src+'?random='+Math.random(),function(data,status,xhr){
					var xml = xhr.responseText//$('<div>').append(xhr.responseText).html()

					var svg_elem = $('svg',data)
					if (!svg_elem.attr('viewBox')) {
						svg_elem.attr('viewBox','0 0 '+svg_elem.attr('width')+' '+svg_elem.attr('height'))
					}
					
					//wrapdiv.find('svg').attr('width','200')

					if (isprint) {
						var cache = self.cachedSVG[src] = { xml: data, colors: {} };
						//console.log('_________xml',cache.xml)
						$(data).find('[sexy]').each(function(key,path){
							var fill = path.style.fill;
							var stroke = path.style.stroke;
							var id = $(path).attr('sexy')
							cache.colors[id] = {};
							if (fill) {
								cache.colors[id]['fill'] = {orig: fill, change: fill}
							}
							if (stroke) {
								//cache.colors.push({ orig: stroke, type: 'stroke', change: stroke, index: key });
								cache.colors[id]['stroke'] = {orig: stroke, change: stroke}
							}
						})
						img.attr('src',self.xml2src(data,self.mergeColors(img)))
					} else {
						img.attr('src',self.xml2src(data))
					}
					//var viewbox = $(data).find('svg').attr('viewBox');
					//if (!viewbox) $(data).find('svg').attr('viewBox','0 0 400 400');
				})
				.fail(function(){
					img.trigger('error')
				})
			}
		} else {
			img.attr('src',src)
		}
		return img;
	},
	mergeColors: function(img){
		var self = this;
		var src = img.data('src')
		var own_colors = JSON.parse(JSON.stringify(self.cachedSVG[src].colors))
		$.each(img.data('colors')||[],function(key,val){
			if (val.fill && own_colors[val.id]) own_colors[val.id]['fill'].change = val.fill;
			if (val.stroke && own_colors[val.id]) own_colors[val.id]['stroke'].change = val.stroke;
		})
		img.data('colors',own_colors)
		return own_colors
	},
	xml2src: function(xml, colors){
		for (var i in colors||{}) {
			for (var j in colors[i]) {
				$('[sexy='+i+']',xml).css(j,colors[i][j].change)
			}
		}
		var str = this.xml2str(xml) + ( colors ? '<!--'+Math.random()+'-->' : '' )
		//console.log(xml,'\n\n\n',str)
		return 'data:image/svg+xml;charset=utf-8;base64,'+Base64.encode(str)
	},
	xml2str: function(xmlNode) {
		return xmlNode.xml ? xmlNode.xml : (new XMLSerializer()).serializeToString(xmlNode);
	},
	fixed: function(number, digits) {
		var multiple = Math.pow(10, digits||4);
		var rndedNum = Math.round(number * multiple) / multiple;
		return rndedNum;
	},
	indexOf: function(array, value){
		if (array.indexOf) return array.indexOf(value)
		else for (var i in array) if (array[i]===value) return i
		return -1
	},
	_destroy: function() {
		console.log('destroy',this)
		this.widget.remove()
	}
})
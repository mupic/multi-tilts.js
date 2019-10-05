(function(factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS style for Browserify
		if(typeof jQuery == 'undefined'){
			module.exports = factory;
		}else{
			module.exports = factory(jQuery);
		}
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function($) {
	"use strict";

	$.fn.tilts = function(_options) {
		var requestAnimFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || false;
		var cancelAnimFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || false;

		var _prefix = '_tilts';
		var _event_prefix = 'tilts';
		var mainBlock = this;

		_options = $.extend(true, {
			innerElement: null, //[Element || String] '.inner-element' - Animate this element, false - Do not animate the current element. Use with dependentElement
			dependentElement: false, //[Element || String] '.dependent-element' - Additional element for animation
			disable: false, // [String] '.disable-element' - Stop the animation if the mouse is on the element.
			axis: true, //x || y
			rotation: { //object{x,y} || number || function
				x: 10, //number || function
				y: 10, //number || function
				reverse: { //bool || object {x,y}
					x: null, // bool
					y: null, // bool
				},
				axis: true, //x || y
			},
			translate: { //object{x,y} || number || function
				x: false, //number || function
				y: false, //number || function
				reverse: { //bool || object {x,y}
					x: null, // bool
					y: null, // bool
				},
				axis: true, //x || y
			},
			distance: { //object{x,y} || number || function
				x: false, //number || function
				y: false, //number || function
			},
			width: false, //number > 0 || 'n%' > 0 || function //Will be calculated relative to the center of the element
			height: false, //number > 0 || 'n%' > 0 || function //Will be calculated relative to the center of the element
			scale: 1,
			speed: 0, //seconds
			delay: 0, //seconds
			timingFunction: 'ease',
			customAnimation: false, //true - disable animation. "Only event" mode
			animationFrame: false, //function(obj){} - custom animation function
			useRequestAnimationFrame: true, //use requestAnimationFrame or not
			autoSizeUpdate: false, //int - how often will be updated (milliseconds). Calculate the size when moving the mouse
			mousemoveInside: false, //function(obj){}
			mousemove: false, //function(obj){}
			mouseenter: false, //function(obj){}
			mouseleave: false, //function(obj){}
			distanceMousemove: false, //function(obj){}
			distanceMouseleave: false, //function(obj){}
			distanceMouseenter: false, //function(obj){}
		}, _options);

		var isObject = function(value){
			return typeof value === 'object' && value !== null;
		}
		var isString = function(value){
			return typeof value === 'string';
		}
		var updateXYOptions = function(name){
			if(isObject(_options[name])){
				if(!_options[name].x)
					_options[name].x = function(){return 0;};
				if(!_options[name].y)
					_options[name].y = function(){return 0;};

				var optionX = _options[name].x;
				_options[name].x = function(properties){
					var value = typeof optionX == 'function'? optionX.call(this, properties) : optionX;
					if(name == 'distance')
						value = value < 0? 0 : value;
					return value;
				};

				var optionY = _options[name].y;
				_options[name].y = function(properties){
					var value = typeof optionY == 'function'? optionY.call(this, properties) : optionY;
					if(name == 'distance')
						value = value < 0? 0 : value;
					return value;
				};

				if(name != 'distance'){
					if(_options[name].reverse == undefined || isObject(_options[name].reverse)){
						if(_options[name].reverse == undefined)
							_options[name].reverse = {};
						if(_options[name].reverse == undefined || !_options[name].reverse.x)
							_options[name].reverse.x = false;
						if(_options[name].reverse == undefined || !_options[name].reverse.y)
							_options[name].reverse.y = false;
					}else{
						_options[name].reverse.x = !!_options[name].reverse;
						_options[name].reverse.y = !!_options[name].reverse;
					}

					_options[name].axis = isString(_options[name].axis)? _options[name].axis : (isString(_options.axis)? _options.axis : true);
				}
			}else{
				var option = _options[name];
				_options[name] = {
					x: function(properties){
						var value = typeof option == 'function'? option.call(this, properties) : option;
						if(name == 'distance')
							value = value < 0? 0 : value;
						return value;
					},
					y: function(properties){
						var value = typeof option == 'function'? option.call(this, properties) : option;
						if(name == 'distance')
							value = value < 0? 0 : value;
						return value;
					},
				};
				if(name != 'distance'){
					_options[name].reverse = {
						x: false,
						y: false,
					};
					_options[name].axis = typeof _options.axis == 'string'? _options.axis : true;
				}
			}
		}

		/* options */
		_options.dependentElement = _options.dependentElement? $(_options.dependentElement) : {length:0};
		if(!_options.dependentElement.length)
			_options.dependentElement = false;

		updateXYOptions('rotation');
		updateXYOptions('translate');
		updateXYOptions('distance');

		/* options end*/


		var _this = {destroyed: true, windowLeave: false};
		var tools = {
			updateSizes: function(){
				_tools.eachEventElements(function() {
					var sizes = _tools.getNewSizes(this);
					_tools.updateData(this, 'width', sizes.width);
					_tools.updateData(this, 'height', sizes.height);
					_tools.updateData(this, 'xy', {x: sizes.x, y: sizes.y});
				});
			},
			destroy: function(reset){
				_this.destroyed = true;
				reset = reset == undefined? true : reset;

				$(window).off('resize', bindFunctins.resize);

				$(document).off('mouseenter', bindFunctins.mouseenterPause);
				$(document).off('mouseleave', bindFunctins.mouseleavePlay);

				$(window).off('mouseleave', bindFunctins._mouseleaveWindow);
				$(window).off('mouseenter', bindFunctins.mouseenterWindow);

				$(window).off('mousemove', bindFunctins.mousemove);

				setTimeout(() => {
					if(reset)
						_tools.reset();

					if(_options.speed || _options.delay)
						if(!_options.customAnimation)
							_tools.eachEventElements(function(transformElement){
								transformElement.css({
									'transition': '',
								});
							});
				}, 10);
			},
			restore: function(){
				if(!_this.destroyed)
					return false;
				_this.destroyed = false;

				$(window).resize(bindFunctins.resize);
				_tools.updateSizes();

				if(typeof _options.disable == 'string')
					$(document).on('mouseenter', _options.disable, bindFunctins.mouseenterPause);
				if(typeof _options.disable == 'string')
					$(document).on('mouseleave', _options.disable, bindFunctins.mouseleavePlay);

				$(document).on('mouseleave', 'body', bindFunctins._mouseleaveWindow);
				$(document).on('mouseenter', 'body', bindFunctins.mouseenterWindow);

				$(window).mousemove(bindFunctins.mousemove);

				if(_options.speed || _options.delay)
					if(!_options.customAnimation)
						_tools.eachEventElements(function(transformElement){
							_tools.putTransition(transformElement, 'transform', _options.speed, _options.timingFunction, _options.delay);
						});

				return true;
			},
			reset: function(){
				_tools.eachEventElements(function(transformElement){
					transformElement.css('transform', '');
				});
			},
			pause: function(el){
				if(typeof el != 'undefined'){
					if(!el.length)
						return null;
					return _tools.updateData(el, 'pause', true);
				}

				return _tools.updateData(mainBlock, 'pause', true);
			},
			play: function(el){
				if(typeof el != 'undefined'){
					if(!el.length)
						return null;
					return _tools.updateData(el, 'pause', false);
				}

				return _tools.updateData(mainBlock, 'pause', false);
			},
			puased: function(el){
				if(typeof el != 'undefined'){
					if(!el.length)
						return null;
					return _tools.getData(el, 'pause');
				}

				return _tools.getData(mainBlock, 'pause');
			},
		};
		var savingDates = {};
		var _tools = {
			getTransformElement: function(eventElement){
				var transformElement = false;
				if(_options.innerElement !== false)
					transformElement = _options.innerElement? $(_options.innerElement, eventElement) : eventElement;
				if(_options.dependentElement){
					if(transformElement === false){
						transformElement = _options.dependentElement;
					}else{
						transformElement = transformElement.add(_options.dependentElement);
					}
				}

				return transformElement;
			},
			eachEventElements: function(callback){
				mainBlock.each(function(index, element) {
					var el = $(element);
					var transformElement = _tools.getTransformElement(el);
					callback.call(el, transformElement);
				});
			},

			getElementOriginalPosition: function(el){

				var obj = window.realSize(el);
				var notTransform = obj.notTransform();

				return {
					x: notTransform.minLeft[0],
					y: notTransform.minTop[1],
					width: notTransform.width,
					height: notTransform.height,
				};
			},
			getMousePos: function(e) {
				var posx = 0;
				var posy = 0;
				if (!e) var e = window.event;
				if (e.pageX || e.pageY) {
					posx = e.pageX;
					posy = e.pageY;
				} else if (e.clientX || e.clientY) {
					posx = e.clientX + document.body.scrollLeft +
						document.documentElement.scrollLeft;
					posy = e.clientY + document.body.scrollTop +
						document.documentElement.scrollTop;
				}
				return {
					x: posx,
					y: posy
				}
			},
			getNewSizes: function(el){
					return _tools.getElementOriginalPosition(el[0]);
			},
			getSize: function(el, name){
				if(_options.autoSizeUpdate >= 10){
					var timeNow = new Date().getTime();
					if(!_tools._timeUpdate || _tools._timeUpdate <= timeNow){
						_tools._timeUpdate = timeNow + _options.autoSizeUpdate;
						tools.updateSizes();
					}

					return _tools.getData(el, name);
				}else{
					return _tools.getData(el, name);
				}
			},
			updateData: function(el, name, value){
				if(!el[0][_prefix+'hash'])
					el[0][_prefix+'hash'] = String(new Date().getTime()) + String(Math.random());

				var hash = el[0][_prefix+'hash'];
				if(savingDates[hash] == undefined)
					savingDates[hash] = {};

				return savingDates[hash][name] = value;

				/*if(typeof el[0][_prefix] == 'undefined')
					el[0][_prefix] = {};
				return el[0][_prefix][name] = value;*/
			},
			getData: function(el, name){

				if(el[0][_prefix+'hash'] == undefined)
					return undefined;

				var hash = el[0][_prefix+'hash'];
				if(savingDates[hash] == undefined)
					savingDates[hash] = {};

				return savingDates[hash][name];

				/*if(typeof el[0][_prefix] == 'undefined')
					el[0][_prefix] = {};
				return el[0][_prefix][name];*/
			},

			putTransition: function(el, option, speed, ease, delay){
				if(!option || !speed)
					return false;

				ease = ease? ease : 'ease';
				delay = delay? delay : '0';
				var trs = el.css('transition');
				var newTrs = '';
				if(trs && trs != 'all 0s ease 0s'){
					trs = trs.split(/[\s]{0,},[\s]{0,}/gi);
					newTrs = trs.join(', ') + ', ';
				}
				newTrs += option + ' ' + speed + 's ' + ease + ' ' + delay + 's';
				return el.css('transition', newTrs);
			},

			enableAxis: function(axis, xy){
				return !isString(axis) || (axis == xy);
			},
		};
		$.extend(_tools, tools);

		var bindFunctins = {
			mouseenterWindow: function(){
				_this.windowLeave = false;
			},
			_mouseleaveWindow: function(e){
				bindFunctins.mouseleaveWindow.call(this, e);
				bindFunctins.mousemove.call(this, e);
			},
			mouseleaveWindow: function(){
				_this.windowLeave = true;
			},

			mouseenterPause: function(){
				_tools.pause();
			},
			mouseleavePlay: function(){
				_tools.play();
			},

			resize: function(){
				if(typeof bindFunctins.resize.setTimeoutID2 != 'undefined')
					clearTimeout(bindFunctins.resize.setTimeoutID2);
				bindFunctins.resize.setTimeoutID2 = setTimeout(function(){
					_tools.reset();
				}, 100);
				if(typeof bindFunctins.resize.setTimeoutID != 'undefined')
					clearTimeout(bindFunctins.resize.setTimeoutID);
				bindFunctins.resize.setTimeoutID = setTimeout(function(){
					_tools.updateSizes();
				}, 200);
			},

			mousemove: function(e) {
				var mouse = _tools.getMousePos(e);
				var x = mouse.x;
				var y = mouse.y;
				_tools.eachEventElements(function(transformElement){
					if(transformElement === false)
						return false;

					var eventElement = this;

					if(_tools.puased(eventElement))
						return true;

					/* width and height <*/
					var customWidth = typeof _options.width == 'function'? _options.width() : _options.width;
					var customHeight = typeof _options.height == 'function'? _options.height() : _options.height;
					var eW, eH;
					var _eW = eW = Number(_tools.getSize(eventElement, 'width'));
					var _eH = eH = Number(_tools.getSize(eventElement, 'height'));
					if(customWidth && typeof customWidth == 'string' && customWidth.indexOf('%')){
						_eW = eW / 100 * parseFloat(customWidth);
					}else if(customWidth){
						_eW = parseFloat(customWidth);
					}
					if(customHeight && typeof customHeight == 'string' && customHeight.indexOf('%')){
						_eH = eH / 100 * parseFloat(customHeight);
					}else if(customHeight){
						_eH = parseFloat(customHeight);
					}
					/*> width and height */

					var elementxy = _tools.getSize(eventElement, 'xy');
					var left = elementxy.x - (_eW - eW) / 2;
					var top = elementxy.y - (_eH - eH) / 2;
					eW = _eW;
					eH = _eH;

					var CX = left + eW / 2;
					var CY = top + eH / 2;
					var X = (CX - x) * (-1);
					var Y = CY - y;
					var absX = Math.abs(X);
					var absY = Math.abs(Y);
					var EnterInX = absX <= eW / 2;
					var EnterInY = absY <= eH / 2;
					var PrevEnterIn = _tools.getData(eventElement, '_EnterIn');
					var EnterIn = EnterInX && EnterInY;
					_tools.updateData(eventElement, '_EnterIn', EnterIn);

					var properties = {
						eventElement: eventElement,
						el: transformElement,
						options: _options,
						mouse: {x: x, y: y},
					};
					var DEGX = _options.rotation.x.call(transformElement, properties);
					var DEGY = _options.rotation.y.call(transformElement, properties);
					var DISX = _options.distance.x.call(transformElement, properties);
					var DISY = _options.distance.y.call(transformElement, properties);
					var TRSX = _options.translate.x.call(transformElement, properties);
					var TRSY = _options.translate.y.call(transformElement, properties);

					var rotateX = 0,
						rotateY = 0,
						percentX = 0,
						percentY = 0;

					/*rotate*/
					(function() {
						if (EnterInX) {
							percentX = (100 / eW * (X * 2));
							if(_tools.enableAxis(_options.rotation.axis, 'x'))
								rotateX = DEGX / 100 * percentX;
						} else {
							var percent = (100 / DISX * (X - (X / absX * eW / 2)));
							if (Math.abs(percent) > 100)
								percent = percent > 0 ? 100 : -100;
							percentX = ((100 * percent / Math.abs(percent)) - percent);
							if(_tools.enableAxis(_options.rotation.axis, 'x'))
								rotateX = DEGX / 100 * percentX;
						}
					})();
					(function() {
						if (EnterInY) {
							percentY = (100 / eH * (Y * 2));
							if(_tools.enableAxis(_options.rotation.axis, 'y'))
								rotateY = DEGY / 100 * percentY;
						} else {
							var percent = (100 / DISY * (Y - (Y / absY * eH / 2)));
							if (Math.abs(percent) > 100)
								percent = percent > 0 ? 100 : -100;
							percentY = ((100 * percent / Math.abs(percent)) - percent);
							if(_tools.enableAxis(_options.rotation.axis, 'y'))
								rotateY = DEGY / 100 * percentY;
						}
					})();
					/*rotate end*/

					var distanceCalcX = function(value){
						if(!value)
							return 0;
						var distancePercentX = 0;
						if(DISX){
							distancePercentX = 100 / DISX * (absY - eH/2);
							if (distancePercentX < 0)
								distancePercentX = 0;
							if (distancePercentX > 100)
								distancePercentX = 100;
							distancePercentX = (100 - distancePercentX);
							value = value / 100 * distancePercentX;
						}else if(EnterIn){
						}else{
							value = 0;
						}

						return value;
					};
					var distanceCalcY = function(value){
						if(!value)
							return 0;
						var distancePercentY = 0;
						if(DISY){
							distancePercentY = 100 / DISY * (absX - eW/2);
							if (distancePercentY < 0)
								distancePercentY = 0;
							if (distancePercentY > 100)
								distancePercentY = 100;
							distancePercentY = (100 - distancePercentY);
							value = value / 100 * distancePercentY;
						}else if(EnterIn){
						}else{
							value = 0;
						}

						return value;
					};

					/*distance*/
					(function() {
						if(_tools.enableAxis(_options.rotation.axis, 'x')){
							rotateX = distanceCalcX(rotateX);
						}
						if(_tools.enableAxis(_options.rotation.axis, 'y')){
							rotateY = distanceCalcY(rotateY);
						}
					})();
					/*distance end*/

					/*rotate*/
					if(_options.rotation.reverse.y){
						rotateY = rotateY * (-1);
					}
					if(_options.rotation.reverse.x){
						rotateX = rotateX * (-1);
					}
					/*rotate end*/

					/*translate*/
					var translateX = 0, translateY = 0;
					if(_tools.enableAxis(_options.translate.axis, 'x'))
						translateX = distanceCalcX(TRSX / 100 * percentX);
					if(_tools.enableAxis(_options.translate.axis, 'y'))
						translateY = distanceCalcY((TRSY / 100 * percentY) * (-1));

					if(_tools.enableAxis(_options.translate.axis, 'x') && _options.translate.reverse.x){
						translateX = translateX * (-1);
					}
					if(_tools.enableAxis(_options.translate.axis, 'y') && _options.translate.reverse.y){
						translateY = translateY * (-1);
					}
					/*translate end*/

					/* distance */
					var prevDistancePercent = _tools.getData(eventElement, 'distancePercent');
					var distancePercent = 100 / DISX * (absX - eW/2);
					if (distancePercent < 0)
						distancePercent = 0;
					if (distancePercent > 100)
						distancePercent = 100;
					distancePercent = distanceCalcX(100 - distancePercent);
					/* distance end */

					/*scale*/
					var scale = _options.scale != 1? 1 + ((_options.scale - 1) / 100 *  distancePercent) : 1;
					/*scale end*/

					properties = {
						eventElement: properties.eventElement,
						el: properties.el,
						options: properties.options,
						mouse: properties.mouse,
						rotationX: rotateY,
						rotationY: rotateX,
						x: translateX,
						y: translateY,
						scale: scale,
						percentX: percentX,
						percentY: percentY,
						distancePercent: distancePercent,
					};
					updateDates(eventElement, properties);

					if(distancePercent){
						build(eventElement, transformElement);

						if(typeof _options.distanceMousemove == 'function')
							_options.distanceMousemove.call(transformElement, properties);
						// eventElement.trigger(_event_prefix + '.distanceMousemove');
					}

					if(distancePercent && distancePercent !== prevDistancePercent){ //enter
						if(typeof _options.distanceMouseenter == 'function')
							_options.distanceMouseenter.call(transformElement, properties);
						// eventElement.trigger(_event_prefix + '.distanceMouseenter');
					}

					if(!distancePercent && distancePercent !== prevDistancePercent){ //leave
						updateDates(eventElement, {});
						build(eventElement, transformElement);

						if(typeof _options.distanceMouseleave == 'function')
							_options.distanceMouseleave.call(transformElement, properties);
						// eventElement.trigger(_event_prefix + '.distanceMouseleave');
					}

					if(EnterIn){
						if(typeof _options.mousemoveInside == 'function')
							_options.mousemoveInside.call(transformElement, properties);
						// eventElement.trigger(_event_prefix + '.mousemoveInside');
					}

					if(typeof _options.mousemove == 'function')
						_options.mousemove.call(transformElement, properties);
					// eventElement.trigger(_event_prefix + '.mousemove');

					if(EnterIn && EnterIn !== PrevEnterIn){ //enter
						if(typeof _options.mouseenter == 'function')
							_options.mouseenter.call(transformElement, properties);
						// eventElement.trigger(_event_prefix + '.mouseenter');
					}
					if(!EnterIn && EnterIn !== PrevEnterIn){ //leave
						if(typeof _options.mouseleave == 'function')
							_options.mouseleave.call(transformElement, properties);
						// eventElement.trigger(_event_prefix + '.mouseleave');
					}
				});

			},
		};

		function updateDates(eventElement, date){
			_tools.updateData(eventElement, 'mouse', (!date.mouse? {x: 0, y: 0} : date.mouse));
			_tools.updateData(eventElement, 'rotateX', (!date.rotationX? 0 : date.rotationX));
			_tools.updateData(eventElement, 'rotateY', (!date.rotationY? 0 : date.rotationY));
			_tools.updateData(eventElement, 'translateX', (!date.x? 0 : date.x));
			_tools.updateData(eventElement, 'translateY', (!date.y? 0 : date.y));
			_tools.updateData(eventElement, 'scale', (!date.scale? 1 : date.scale));
			_tools.updateData(eventElement, 'percentX', (!date.percentX? 0 : date.percentX));
			_tools.updateData(eventElement, 'percentY', (!date.percentY? 0 : date.percentY));
			_tools.updateData(eventElement, 'distancePercent', (!date.distancePercent? 0 : date.distancePercent));
		}
		function getDates(eventElement, transformElement){
			var properties = {
				eventElement: eventElement,
				el: transformElement,
				options: _options,
				mouse: _tools.getData(eventElement, 'mouse'),
				rotationX: _tools.getData(eventElement, 'rotateX'),
				rotationY: _tools.getData(eventElement, 'rotateY'),
				x: _tools.getData(eventElement, 'translateX'),
				y: _tools.getData(eventElement, 'translateY'),
				percentX: _tools.getData(eventElement, 'percentX'),
				percentY: _tools.getData(eventElement, 'percentY'),
				distancePercent: _tools.getData(eventElement, 'distancePercent'),
				scale: _tools.getData(eventElement, 'scale'),
			};

			return properties;
		}

		function build(eventElement, transformElement){
			if(_options.useRequestAnimationFrame && requestAnimFrame){
				if(!_tools.getData(eventElement, 'requestAnimFrameStart')){
					_tools.updateData(eventElement, 'requestAnimFrameStart', true);
					(function requestFrame(){
						var id = requestAnimFrame(requestFrame);
						apply(eventElement, transformElement);
						if(_this.destroyed || _this.windowLeave || !_tools.getData(eventElement, 'distancePercent')){
							cancelAnimFrame(id);
							_tools.updateData(eventElement, 'requestAnimFrameStart', false);
							if(_this.windowLeave){
								updateDates(eventElement, {});
								apply(eventElement, transformElement);
							}
						}
					})();
				}
			}else{
				if(_this.windowLeave)
					updateDates(eventElement, {});
				apply(eventElement, transformElement);
			}
		}

		function apply(eventElement, transformElement){
			var properties = getDates(eventElement, transformElement);

			if(typeof _options.animationFrame == 'function')
				_options.animationFrame.call(transformElement, properties);

			if (_options.customAnimation == true) {
				/**/
			} else {
				if(transformElement === false)
					return;

				var transform = '';
				if(_options.rotation.x && _tools.enableAxis(_options.rotation.axis, 'x')){
					transform += 'rotateX(' + properties.rotationX + 'deg) ';
				}
				if(_options.rotation.y && _tools.enableAxis(_options.rotation.axis, 'y')){
					transform += 'rotateY(' + properties.rotationY + 'deg) ';
				}
				if(_options.scale != 1){
					transform += 'scale(' + properties.scale + ') ';
				}
				if(_options.translate.x && _tools.enableAxis(_options.translate.axis, 'x')){
					transform += 'translateX(' + properties.x + 'px) ';
				}
				if(_options.translate.y && _tools.enableAxis(_options.translate.axis, 'y')){
					transform += 'translateY(' + properties.y + 'px) ';
				}

				transformElement.css({
					'transform': transform,
				});
			}
		}

		_tools.restore();

		return tools;
	};

	return $;

}));
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

	$.fn.multiTilts = function(_options) {
		var requestAnimFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || false;
		var cancelAnimFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || false;

		var _prefix = '_tilts';
		var _event_prefix = 'tilts';
		var mainBlock = this;

		_options = $.extend(true, {
			innerElement: null, // '.inner-element', false - Do not transform the current main-element.
			dependentElement: false, // '.dependent-element' - Will transform just like the main-element
			disable: false, // '.disable-element' - Stop the animation if the mouse is on the element.
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
			scale: 1,
			speed: 0, //seconds
			delay: 0, //seconds
			timingFunction: 'ease',
			customAnimation: false, //true - animation not playing. Only event mode.
			realTimeUpdateResize: false,
			mousemoveInside: false, //function(obj){}
			mousemove: false, //function(obj){}
			mouseenter: false, //function(obj){}
			mouseleave: false, //function(obj){}
			distanceMousemove: false, //function(obj){}
			distanceMouseleave: false, //function(obj){}
			distanceMouseenter: false, //function(obj){}
			animationFrame: false, //function(obj){}
		}, _options);

		var isObject = function(value){
			return typeof value === 'object' && value !== null;
		}
		var isString = function(value){
			return typeof value === 'string';
		}
		var updateOptions = function(name){
			if(isObject(_options[name])){
				if(!_options[name].x)
					_options[name].x = function(){return 0;};
				if(!_options[name].y)
					_options[name].y = function(){return 0;};

				var optionX = _options[name].x;
				_options[name].x = function(){
					var value = typeof optionX == 'function'? optionX() : optionX;
					if(name == 'distance')
						value = value < 0? 0 : value;
					return value;
				};

				var optionY = _options[name].y;
				_options[name].y = function(){
					var value = typeof optionY == 'function'? optionY() : optionY;
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
					x: function(){
						var value = typeof option == 'function'? option() : option;
						if(name == 'distance')
							value = value < 0? 0 : value;
						return value;
					},
					y: function(){
						var value = typeof option == 'function'? option() : option;
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

		updateOptions('rotation');
		updateOptions('translate');
		updateOptions('distance');

		/* options end*/


		var _this = {destroyed: true, windowLeave: false};
		var objTools = {
			updateSizes: function(){
				_objTools.eachMainElements(function() {
					_objTools.updateData(this, 'width', _objTools.getNewSizes(this, 'width'));
					_objTools.updateData(this, 'height', _objTools.getNewSizes(this, 'height'));
					_objTools.updateData(this, 'xy', _objTools.getNewSizes(this, 'xy'));
				});
			},
			destroy: function(reset){
				_this.destroyed = true;
				reset = reset == undefined? true : reset;

				$(window).off('resize', bindFunctins.resize);

				$(document).off('mouseenter', bindFunctins.mouseenterPause);
				$(document).off('mouseleave', bindFunctins.mouseleavePlay);
			
				$(window).off('mouseleave', bindFunctins.mouseleaveWindow);
				$(window).off('mouseenter', bindFunctins.mouseenterWindow);

				$(window).off('mousemove', bindFunctins.mousemove);

				if(reset)
					_objTools.reset();

				if(_options.speed || _options.delay)
					if(!_options.customAnimation)
						_objTools.eachMainElements(function(transformElement){
							transformElement.css({
								'transition': '',
							});
						});
			},
			restore: function(){
				if(!_this.destroyed)
					return false;
				_this.destroyed = false;

				$(window).resize(bindFunctins.resize);
				_objTools.updateSizes();

				if(_options.disable)
					$(document).on('mouseenter', _options.disable, bindFunctins.mouseenterPause);
				if(_options.disable)
					$(document).on('mouseleave', _options.disable, bindFunctins.mouseleavePlay);

				$(window).on('mouseleave', bindFunctins.mouseleaveWindow);
				$(window).on('mouseenter', bindFunctins.mouseenterWindow);

				$(window).mousemove(bindFunctins.mousemove);

				if(_options.speed || _options.delay)
					if(!_options.customAnimation)
						_objTools.eachMainElements(function(transformElement){
							_objTools.putTransition(transformElement, 'transform', _options.speed, _options.timingFunction, _options.delay);
						});

				return true;
			},
			reset: function(){
				_objTools.eachMainElements(function(transformElement){
					transformElement.css({
						'transform': '',
					});
				});
			},
			pause: function(el){
				if(typeof el != 'undefined'){
					if(!el.length)
						return null;
					return _objTools.updateData(el, 'pause', true);
				}

				return _objTools.updateData(mainBlock, 'pause', true);
			},
			play: function(el){
				if(typeof el != 'undefined'){
					if(!el.length)
						return null;
					return _objTools.updateData(el, 'pause', false);
				}

				return _objTools.updateData(mainBlock, 'pause', false);
			},
			puased: function(el){
				if(typeof el != 'undefined'){
					if(!el.length)
						return null;
					return _objTools.getData(el, 'pause');
				}

				return _objTools.getData(mainBlock, 'pause');
			},
		};
		var savingDates = {};
		var _objTools = {
			getTransformElement: function(mainElement){
				var transformElement = false;
				if(_options.innerElement !== false)
					transformElement = _options.innerElement? $(_options.innerElement, mainElement) : mainElement;
				if(_options.dependentElement){
					if(transformElement === false){
						transformElement = _options.dependentElement;
					}else{
						transformElement = transformElement.add(_options.dependentElement);
					}
				}

				return transformElement;
			},
			eachMainElements: function(callback){
				mainBlock.each(function(index, element) {
					var el = $(element);
					var transformElement = _objTools.getTransformElement(el);
					callback.call(el, transformElement);
				});
			},

			getElementOriginalPosition: function(el){
				var MainEl = el;
				var xPos = 0;
				var yPos = 0;

				var hasFixed = false;
				while (el) {
					if(!hasFixed && getComputedStyle(el).position == 'fixed')
						hasFixed = true;

					if (el.tagName == "BODY") {
						break;
					} else {
						// for all other non-BODY elements
						xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
						yPos += (el.offsetTop - el.scrollTop + el.clientTop);
					}
					el = el.offsetParent;
				}

				var body = document.getElementsByTagName('body')[0];
				// deal with browser quirks with body/window/document and page scroll
				var xScroll = body.scrollLeft || document.documentElement.scrollLeft;
				var yScroll = body.scrollTop || document.documentElement.scrollTop;
				var bodyXY = {x: 0, y: 0};
				if(!hasFixed){
					bodyXY = body.getBoundingClientRect();
					bodyXY.x = bodyXY.x + xScroll; //offset left
					bodyXY.y = bodyXY.y + yScroll; //offset top

					xScroll = 0;
					yScroll = 0;
				}

				xPos += (body.offsetLeft + xScroll + body.clientLeft + bodyXY.x);
				yPos += (body.offsetTop + yScroll + body.clientTop + bodyXY.y);

				return {
					x: xPos,
					y: yPos
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
			getNewSizes: function(el, name){
				if(name == 'width')
					return el.outerWidth();
				if(name == 'height')
					return el.outerHeight()
				if(name == 'xy')
					return _objTools.getElementOriginalPosition(el[0]);
			},
			getSize: function(el, name){
				if(_options.realTimeUpdateResize){
					return _objTools.getNewSizes(el, name);
				}else{
					return _objTools.getData(el, name);
				}
			},
			updateData: function(el, name, value){
				if(!el[0][_prefix+'hash'])
					el[0][_prefix+'hash'] = String(Date.now()) + String(Math.random());

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
		$.extend(_objTools, objTools);

		var bindFunctins = {
			mouseenterWindow: function(){
				_this.windowLeave = false;
			},
			mouseleaveWindow: function(){
				_this.windowLeave = true;
			},

			mouseenterPause: function(){
				_objTools.pause();
			},
			mouseleavePlay: function(){
				_objTools.play();
			},

			resize: function(){
				if(typeof bindFunctins.resize.setTimeoutID2 != 'undefined')
					clearTimeout(bindFunctins.resize.setTimeoutID2);
				bindFunctins.resize.setTimeoutID2 = setTimeout(function(){
					_objTools.reset();
				}, 100);
				if(typeof bindFunctins.resize.setTimeoutID != 'undefined')
					clearTimeout(bindFunctins.resize.setTimeoutID);
				bindFunctins.resize.setTimeoutID = setTimeout(function(){
					_objTools.updateSizes();
				}, 200);
			},

			mousemove: function(e) {
				var mouse = _objTools.getMousePos(e);
				var x = mouse.x;
				var y = mouse.y;
				_objTools.eachMainElements(function(transformElement){
					var mainElement = this;

					if(_objTools.puased(mainElement))
						return true;

					var eW = _objTools.getSize(mainElement, 'width');
					var eH = _objTools.getSize(mainElement, 'height');
					var elementxy = _objTools.getSize(mainElement, 'xy');
					var left = elementxy.x;
					var top = elementxy.y;

					var CX = left + eW / 2;
					var CY = top + eH / 2;
					var X = (CX - x) * (-1);
					var Y = CY - y;
					var absX = Math.abs(X);
					var absY = Math.abs(Y);
					var EnterInX = absX <= eW / 2;
					var EnterInY = absY <= eH / 2;
					var PrevEnterIn = _objTools.getData(mainElement, '_EnterIn');
					var EnterIn = EnterInX && EnterInY;
					_objTools.updateData(mainElement, '_EnterIn', EnterIn);

					var DEGX = _options.rotation.x();
					var DEGY = _options.rotation.y();
					var DISX = _options.distance.x();
					var DISY = _options.distance.y();
					var TRSX = _options.translate.x();
					var TRSY = _options.translate.y();

					// console.log(X, Y);

					var rotateX = 0,
						rotateY = 0,
						percentX = 0,
						percentY = 0;

					/*rotate*/
					(function() {
						if (EnterInX) {
							percentX = (100 / eW * (X * 2));
							if(_objTools.enableAxis(_options.rotation.axis, 'x'))
								rotateX = DEGX / 100 * percentX;
						} else {
							var percent = (100 / DISX * (X - (X / absX * eW / 2)));
							if (Math.abs(percent) > 100)
								percent = percent > 0 ? 100 : -100;
							percentX = ((100 * percent / Math.abs(percent)) - percent);
							if(_objTools.enableAxis(_options.rotation.axis, 'x'))
								rotateX = DEGX / 100 * percentX;
						}
					})();
					(function() {
						if (EnterInY) {
							percentY = (100 / eH * (Y * 2));
							if(_objTools.enableAxis(_options.rotation.axis, 'y'))
								rotateY = DEGY / 100 * percentY;
						} else {
							var percent = (100 / DISY * (Y - (Y / absY * eH / 2)));
							if (Math.abs(percent) > 100)
								percent = percent > 0 ? 100 : -100;
							percentY = ((100 * percent / Math.abs(percent)) - percent);
							if(_objTools.enableAxis(_options.rotation.axis, 'y'))
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
							distancePercentX = 100;
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
							distancePercentY = 100;
						}else{
							value = 0;
						}

						return value;
					};

					/*distance*/
					(function() {
						if(_objTools.enableAxis(_options.rotation.axis, 'x')){
							rotateX = distanceCalcX(rotateX);
						}
						if(_objTools.enableAxis(_options.rotation.axis, 'y')){
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
					if(_objTools.enableAxis(_options.translate.axis, 'x'))
						translateX = distanceCalcX(TRSX / 100 * percentX);
					if(_objTools.enableAxis(_options.translate.axis, 'y'))
						translateY = distanceCalcY((TRSY / 100 * percentY) * (-1));

					if(_objTools.enableAxis(_options.translate.axis, 'x') && _options.translate.reverse.x){
						translateX = translateX * (-1);
					}
					if(_objTools.enableAxis(_options.translate.axis, 'y') && _options.translate.reverse.y){
						translateY = translateY * (-1);
					}
					/*translate end*/

					/* distance */
					var prevDistancePercent = _objTools.getData(mainElement, 'distancePercent');
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

					var text = '';
					// for (var i = 1; i <= 60; i += 1) {
					// 	var color = 'hsl('+ (360/60) * i +', 100%, 60%)';
					// 	text += distanceCalcX(i / 100 * percentX) * (-1) + 'px ' + distanceCalcY(i / 100 * percentY) + 'px 0 ' + color + ', ';
					// }
					text += '0 0 0';

					var properties = {
						mainElement: mainElement,
						el: transformElement,
						options: _options,
						mouse: {x: x, y: y},
						rotationX: rotateY,
						rotationY: rotateX,
						x: translateX,
						y: translateY,
						scale: scale,
						percentX: percentX,
						percentY: percentY,
						distancePercent: distancePercent,
						textShadow: text,
					};
					updateDates(mainElement, properties);

					if(distancePercent){
						build(mainElement, transformElement);

						if(typeof _options.distanceMousemove == 'function')
							_options.distanceMousemove.call(transformElement, properties);
						mainElement.trigger(_event_prefix + '.distanceMousemove');
					}

					if(distancePercent && distancePercent !== prevDistancePercent){ //enter
						if(typeof _options.distanceMouseenter == 'function')
							_options.distanceMouseenter.call(transformElement, properties);
						mainElement.trigger(_event_prefix + '.distanceMouseenter');
					}

					if(!distancePercent && distancePercent !== prevDistancePercent){ //leave
						updateDates(mainElement, {});
						build(mainElement, transformElement);

						if(typeof _options.distanceMouseleave == 'function')
							_options.distanceMouseleave.call(transformElement, properties);
						mainElement.trigger(_event_prefix + '.distanceMouseleave');
					}

					if(EnterIn){
						if(typeof _options.mousemoveInside == 'function')
							_options.mousemoveInside.call(transformElement, properties);
						mainElement.trigger(_event_prefix + '.mousemoveInside');
					}

					if(typeof _options.mousemove == 'function')
						_options.mousemove.call(transformElement, properties);
					mainElement.trigger(_event_prefix + '.mousemove');

					if(EnterIn && EnterIn !== PrevEnterIn){ //enter
						if(typeof _options.mouseenter == 'function')
							_options.mouseenter.call(transformElement, properties);
						mainElement.trigger(_event_prefix + '.mouseenter');
					}
					if(!EnterIn && EnterIn !== PrevEnterIn){ //leave
						if(typeof _options.mouseleave == 'function')
							_options.mouseleave.call(transformElement, properties);
						mainElement.trigger(_event_prefix + '.mouseleave');
					}
				});

			},
		};

		function updateDates(mainElement, date){
			_objTools.updateData(mainElement, 'mouse', (!date.mouse? 0 : date.mouse));
			_objTools.updateData(mainElement, 'rotateX', (!date.rotationX? 0 : date.rotationX));
			_objTools.updateData(mainElement, 'rotateY', (!date.rotationY? 0 : date.rotationY));
			_objTools.updateData(mainElement, 'translateX', (!date.x? 0 : date.x));
			_objTools.updateData(mainElement, 'translateY', (!date.y? 0 : date.y));
			_objTools.updateData(mainElement, 'scale', (!date.scale? 1 : date.scale));
			_objTools.updateData(mainElement, 'percentX', (!date.percentX? 0 : date.percentX));
			_objTools.updateData(mainElement, 'percentY', (!date.percentY? 0 : date.percentY));
			_objTools.updateData(mainElement, 'distancePercent', (!date.distancePercent? 0 : date.distancePercent));
			_objTools.updateData(mainElement, 'textShadow', (!date.textShadow? 0 : date.textShadow));
		}
		function getDates(mainElement, transformElement){
			var properties = {
				mainElement: mainElement,
				el: transformElement,
				options: _options,
				mouse: _objTools.getData(mainElement, 'mouse'),
				rotationX: _objTools.getData(mainElement, 'rotateX'),
				rotationY: _objTools.getData(mainElement, 'rotateY'),
				x: _objTools.getData(mainElement, 'translateX'),
				y: _objTools.getData(mainElement, 'translateY'),
				percentX: _objTools.getData(mainElement, 'percentX'),
				percentY: _objTools.getData(mainElement, 'percentY'),
				distancePercent: _objTools.getData(mainElement, 'distancePercent'),
				scale: _objTools.getData(mainElement, 'scale'),
				textShadow: _objTools.getData(mainElement, 'textShadow'),
			};

			return properties;
		}

		function build(mainElement, transformElement){
			if(requestAnimFrame){
					if(!_objTools.getData(mainElement, 'requestAnimFrameStart')){
						_objTools.updateData(mainElement, 'requestAnimFrameStart', true);
						(function requestFrame(){
							var id = requestAnimFrame(requestFrame);
							apply(mainElement, transformElement);
							if(_this.windowLeave || !_objTools.getData(mainElement, 'distancePercent')){
								cancelAnimFrame(id);
								_objTools.updateData(mainElement, 'requestAnimFrameStart', false);
								if(_this.windowLeave){
									updateDates(mainElement, {});
									apply(mainElement, transformElement);
								}
							}
						})();
					}
			}else{
				apply(mainElement, transformElement);
			}
		}

		function apply(mainElement, transformElement){
			var properties = getDates(mainElement, transformElement);

			if(typeof _options.animationFrame == 'function')
				_options.animationFrame.call(transformElement, properties);

			if (_options.customAnimation == true) {
				/**/
			} else {
				if(transformElement === false)
					return;

				var transform = '';
				if(_options.rotation.x && _objTools.enableAxis(_options.rotation.axis, 'x')){
					transform += 'rotateX(' + properties.rotationX + 'deg) ';
				}
				if(_options.rotation.y && _objTools.enableAxis(_options.rotation.axis, 'y')){
					transform += 'rotateY(' + properties.rotationY + 'deg) ';
				}
				if(_options.scale != 1){
					transform += 'scale(' + properties.scale + ') ';
				}
				if(_options.translate.x && _objTools.enableAxis(_options.translate.axis, 'x')){
					transform += 'translateX(' + properties.x + 'px) ';
				}
				if(_options.translate.y && _objTools.enableAxis(_options.translate.axis, 'y')){
					transform += 'translateY(' + properties.y + 'px) ';
				}

				transformElement.css({
					'transform': transform,
					'text-shadow': properties.textShadow,
				});
			}
		}

		_objTools.restore();

		return objTools;
	};

	return $;

}));
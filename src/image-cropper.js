var time;//背景变暗延时函数
Component({
  properties: {
    /**
     * 图片路径
     */
    'imgSrc': {
      type: String
    },
    /**
     * 剪裁框高度
     */
    'height': {
      type: Number,
      value: 200
    },
    /**
     * 剪裁框宽度
     */
    'width': {
      type: Number,
      value: 200
    },
    /**
     * 生成的图片质量0-1
     */
    'quality': {
      type: Number,
      value: 1
    },
    /**
     * canvas上边距（不设置默认不显示）
     */
    'canvas_top': {
      type: Number,
      value: null
    },
    /**
     * canvas左边距（不设置默认不显示）
     */
    'canvas_left': {
      type: Number,
      value: null
    },
    /**
     * 图片宽度
     */
    'imgWidth': {
      type: null,
      value: null
    },
    /**
     * 图片高度
     */
    'imgHeight': {
      type: null,
      value: null
    },
    /**
     * 图片缩放比
     */
    'scale': {
      type: Number,
      value: 1
    },
    /**
     * 图片旋转角度
     */
    'rotate': {
      type: Number,
      value: 0
    },
    /**
     * 最小缩放比
     */
    'min_scale': {
      type: Number,
      value: 0.5
    },
    /**
     * 最大缩放比
     */
    'max_scale': {
      type: Number,
      value: 2
    },
    /**
     * 是否禁用旋转
     */
    'disable_rotate': {
      type: Number,
      value: false
    },
  },
  data: {
    el: 'image-cropper', //暂时无用
    info: wx.getSystemInfoSync(),
    init_imgWidth: 0, //图片设置尺寸,此值不变（记录最初设定的尺寸）
    init_imgHeight: 0, //图片设置尺寸,此值不变（记录最初设定的尺寸）
    origin_x: 0.5, //图片旋转中心
    origin_y: 0.5, //图片旋转中心
    imgTop: wx.getSystemInfoSync().windowHeight / 2, //图片上边距
    imgLeft: wx.getSystemInfoSync().windowWidth / 2, //图片左边距
    touch_img_relative: [{
      x: 0,
      y: 0
    }], //鼠标和图片中心的相对位置
    first_Hypotenuse: 0, //双指触摸时斜边长度
    flag: false, //是否结束触摸
    flag_bright: true, //背景是否亮
    canvas_overflow:true,//canvas缩略图是否在屏幕外面
    watch: {
      //监听截取框宽高变化
      width: function(value, that) {
        that._changeWindowSize();
      },
      height: function(value, that) {
        that._changeWindowSize();
      },
      canvas_top: function (value, that){
        if(that.data.canvas_top < - that.data.height || that.data.canvas_top > that.data.info.windowHeight){
          that.data.canvas_overflow = true; 
        }else{
          that.data.canvas_overflow = false; 
        }
      },
      canvas_left: function (value, that){
        if (that.data.canvas_left < -that.data.width || that.data.canvas_left > that.data.info.windowWidth) {
          that.data.canvas_overflow = true;
        } else {
          that.data.canvas_overflow = false;
        }
      }
    }
  },
  attached: function() {
    this._watcher(); //启用数据监听
    this._changeWindowSize(); //设置截取框大小、绘制canvas
    this.data.init_imgWidth = this.data.imgWidth;
    this.data.init_imgHeight = this.data.imgHeight;
    //处理宽高特殊单位
    if (this.data.imgWidth && this.data.imgWidth.indexOf("%") != -1) {
      let width = this.data.imgWidth.replace("%", "");
      this.setData({
        imgWidth: this.data.info.windowWidth / 100 * width,
        init_imgWidth: this.data.info.windowWidth / 100 * width
      });
    }
    if (this.data.imgHeight && this.data.imgHeight.indexOf("%") != -1) {
      let height = this.data.imgHeight.replace("%", "");
      this.setData({
        imgHeight: this.data.info.windowHeight / 100 * height,
        init_imgHeight: this.data.info.windowHeight / 100 * height
      });
    }
    //如果设置canvas坐标，默认不显示（超出屏幕外）
    if (this.data.canvas_top != null && this.data.canvas_left == null) {
      this.setData({
        canvas_left: 0
      });
    } else if (this.data.canvas_top == null && this.data.canvas_left != null) {
      this.setData({
        canvas_top: 0
      });
    } else if (this.data.canvas_top == null && this.data.canvas_left == null){
      this.setData({
        canvas_top: -3000
      });
    }
    this.data.watch.canvas_top(null,this);
    this.data.watch.canvas_left(null, this);
  },
  methods: {
    /**
     * 返回图片路径
     */
    getImg: function (getCallback) {
      this._draw();
      wx.canvasToTempFilePath({
        width: this.data.width,
        height: this.data.height,
        destWidth: this.data.width * 3,
        destHeight: this.data.height * 3,
        fileType: 'png',
        quality: this.data.quality,
        canvasId: this.data.el,
        success: function (res) {
          getCallback(res.tempFilePath);
        }
      }, this);
    },
    /**
     * 点击中间剪裁框的回调
     */
    clickCallback: function (callback) {
      this._clickCallback = callback;
    },
    /**
     * 设置图片动画
     * {
     *    x:10,//图片在原有基础上向下移动10px
     *    y:10,//图片在原有基础上向右移动10px
     *    rotate:10,//图片在原有基础上旋转10deg
     *    scale:0.5,//图片在原有基础上增加0.5倍
     * }
     */
    setTransform: function (transform) {
      if (!transform) return;
      var scale = this.data.scale;
      if (transform.scale) {
        scale = this.data.scale + transform.scale;
        scale = scale <= this.data.min_scale ? this.data.min_scale : scale;
        scale = scale >= this.data.max_scale ? this.data.max_scale : scale;
      }
      this.setData({
        imgTop: transform.y ? this.data.imgTop + transform.y : this.data.imgTop,
        imgLeft: transform.x ? this.data.imgLeft + transform.x : this.data.imgLeft,
        rotate: (transform.rotate ? this.data.rotate + transform.rotate : transform.rotate).toFixed(2),
        scale: scale.toFixed(3)
      });
      if (!this.data.canvas_overflow){
        this._draw();
      }
    },
    /**
     * 上传图片
     */
    upload: function () {
      let that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success(res) {
          const tempFilePaths = res.tempFilePaths[0];
          that.pushImg(tempFilePaths);
        }
      })
    },
    /**
     * 设置剪裁框宽度
     */
    setWidth: function (width) {
      this.setData({
        width: width
      });
      this._changeWindowSize();
    },
    /**
     * 设置剪裁框高度
     */
    setHeight: function (height) {
      this.setData({
        height: height
      });
      this._changeWindowSize();
    },
    /**
     * 加载（更换）图片
     */
    pushImg: function (src) {
      if (src) {
        this.setData({
          imgSrc: src
        });
      }
      wx.getImageInfo({
        src: this.data.imgSrc,
        success: (res) => {
          let imgWidth = this.data.imgWidth,
            imgHeight = this.data.imgHeight;
          if (this.data.init_imgWidth && this.data.init_imgHeight) { } else if (!this.data.init_imgHeight && !this.data.init_imgWidth) {
            imgWidth = res.width;
            imgHeight = res.height;
          } else if (this.data.init_imgHeight) {
            imgWidth = res.width / res.height * this.data.init_imgHeight;
          } else if (this.data.init_imgWidth) {
            imgHeight = res.height / res.width * this.data.init_imgWidth;
          }
          this.setData({
            imgSrc: res.path,
            imgWidth: imgWidth,
            imgHeight: imgHeight,
          });
          this._draw();
        },
        fail: (err) => {
          this.setData({
            imgSrc: ''
          });
        }
      });
    },
    /**
     * 设置图片放大缩小
     */
    setScale: function (scale) {
      if (!scale) return;
      // scale = scale <= this.data.min_scale ? this.data.min_scale : scale;
      // scale = scale >= this.data.max_scale ? this.data.max_scale : scale;
      this.setData({
        scale: scale.toFixed(3)
      });
      if (!this.data.canvas_overflow) {
        this._draw();
      }
    },
    /**
     * 设置图片旋转角度
     */
    setRotate: function (rotate) {
      if (!rotate) return;
      this.setData({
        rotate: rotate.toFixed(2)
      });
      if (!this.data.canvas_overflow) {
        this._draw();
      }
    },
    _init: function() {
      //初始化canvas
      this.data.ctx = wx.createCanvasContext(this.data.el, this);
      this.data.ctx.width = this.data.width;
      this.data.ctx.height = this.data.height;
      if (this.data.imgSrc) {
        this.pushImg();
      }
    },
    //改变截取框大小
    _changeWindowSize: function () {
      if (this.data.width > this.data.info.windowWidth) {
        this.setData({
          width: this.data.info.windowWidth,
        });
      };
      if (this.data.height > this.data.info.windowHeight) {
        this.setData({
          height: this.data.info.windowHeight,
        });
      }
      this.setData({
        cut_top: (this.data.info.windowHeight - this.data.height) * 0.5, //截取的框上边距
        cut_left: (this.data.info.windowWidth - this.data.width) * 0.5, //截取的框左边距
      });
      this._init();
    },
    //开始触摸
    _start: function(event) {
      this.data.flag = false;
      if (event.touches.length == 1) {
        //单指拖动
        this.setData({
          "touch_img_relative[0]": {
            x: event.touches[0].clientX - this.data.imgLeft,
            y: event.touches[0].clientY - this.data.imgTop
          }
        });
      } else {
        //双指放大
        let width = Math.abs(event.touches[0].clientX - event.touches[1].clientX);
        let height = Math.abs(event.touches[0].clientY - event.touches[1].clientY);
        let touch_img_relative = [{
          x: this.data.imgWidth - (this.data.imgLeft + this.data.imgWidth - event.touches[0].clientX),
          y: this.data.imgHeight - (this.data.imgTop + this.data.imgHeight - event.touches[0].clientY)
        }, {
          x: this.data.imgWidth - (this.data.imgLeft + this.data.imgWidth - event.touches[1].clientX),
          y: this.data.imgHeight - (this.data.imgTop + this.data.imgHeight - event.touches[1].clientY)
        }];
        this.setData({
          first_Hypotenuse: Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)),
          touch_img_relative: touch_img_relative
        });
      }
      if (!this.data.canvas_overflow) {
        this._draw(); //实时渲染canvas
      }
    },
    _move: function(event) {
      if (this.data.flag) return;
      if (!this.data.flag_bright) {
        clearTimeout(time);
        this.setData({
          flag_bright: true
        });
      }
      if (event.touches.length == 1) {
        //单指拖动
        let left = event.touches[0].clientX - this.data.touch_img_relative[0].x,
          top = event.touches[0].clientY - this.data.touch_img_relative[0].y;
        // left = left < 0 ? 0 : left;
        // top = top < 0 ? 0 : top;
        this.setData({
          imgLeft: left,
          imgTop: top
        });
      } else {
        //双指放大
        let width = Math.abs(event.touches[0].clientX - event.touches[1].clientX),
          height = Math.abs(event.touches[0].clientY - event.touches[1].clientY),
          hypotenuse = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)),
          scale = this.data.scale * (hypotenuse / this.data.first_Hypotenuse),
          current_deg = 0;
        scale = scale <= this.data.min_scale ? this.data.min_scale : scale;
        scale = scale >= this.data.max_scale ? this.data.max_scale : scale;
        //双指旋转(如果没禁用旋转)
        let touch_img_relative = [{
          x: this.data.imgWidth - (this.data.imgLeft + this.data.imgWidth - event.touches[0].clientX),
          y: this.data.imgHeight - (this.data.imgTop + this.data.imgHeight - event.touches[0].clientY)
        }, {
          x: this.data.imgWidth - (this.data.imgLeft + this.data.imgWidth - event.touches[1].clientX),
          y: this.data.imgHeight - (this.data.imgTop + this.data.imgHeight - event.touches[1].clientY)
        }];
        if (!this.data.disable_rotate){
          let first_atan = 180 / Math.PI * Math.atan2(touch_img_relative[0].y, touch_img_relative[0].x);
          let first_atan_old = 180 / Math.PI * Math.atan2(this.data.touch_img_relative[0].y, this.data.touch_img_relative[0].x);
          let second_atan = 180 / Math.PI * Math.atan2(touch_img_relative[1].y, touch_img_relative[1].x);
          let second_atan_old = 180 / Math.PI * Math.atan2(this.data.touch_img_relative[1].y, this.data.touch_img_relative[1].x);
          //当前旋转的角度
          let first_deg = first_atan - first_atan_old,
              second_deg = second_atan - second_atan_old;
          if (first_deg != 0) {
            current_deg = first_deg;
          } else if (second_deg != 0) {
            current_deg = second_deg;
          }
        }
        this.setData({
          rotate: this.data.rotate + current_deg,
          scale: scale,
          first_Hypotenuse: Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)),
          touch_img_relative: touch_img_relative
        });
      }
      if (!this.data.canvas_overflow) {
        this._draw();
      }
    },
    //结束操作
    _end: function(event) {
      this.data.flag = true;
      clearTimeout(time);
      time = setTimeout(() => {
        this.setData({
          flag_bright: false
        });
      }, 1000)
    },
    //点击中间剪裁框处理
    _click: function (event) {
      if (!this.data.imgSrc) {
        this.upload();
        return;
      }
      this._draw();
      let x = event.detail.x;
      let y = event.detail.y;
      if ((x >= this.data.cut_left && x <= (this.data.cut_left + this.data.width)) && (y >= this.data.cut_top && y <= (this.data.cut_top + this.data.height))) {
        wx.canvasToTempFilePath({
          width: this.data.width,
          height: this.data.height,
          destWidth: this.data.width * 3,
          destHeight: this.data.height * 3,
          fileType: 'png',
          quality: this.data.quality,
          canvasId: this.data.el,
          success: (res) => {
            this._clickCallback(res.tempFilePath);
          }
        }, this)
      }
    },
    //渲染
    _draw: function() {
      if (!this.data.imgSrc) return;
      //图片实际大小
      let imgWidth = this.data.imgWidth * this.data.scale;
      let imgHeight = this.data.imgHeight * this.data.scale;
      //canvas和图片的相对距离
      var xpos = this.data.imgLeft - this.data.cut_left;
      var ypos = this.data.imgTop - this.data.cut_top;
      //旋转画布
      this.data.ctx.translate(xpos, ypos);
      this.data.ctx.rotate(this.data.rotate * Math.PI / 180);
      this.data.ctx.drawImage(this.data.imgSrc, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
      this.data.ctx.draw();
    },
    //监听器
    _watcher: function() {
      Object.keys(this.data.watch).forEach(v => {
        this._observe(this.data, v, this.data.watch[v]);
      })
    },
    _observe: function(obj, key, watchFun) {
      var val = obj[key]; // 给该属性设默认值
      Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        set:(value) => {
          val = value;
          watchFun(val, this);
        },
        get: function() {
          return val;
        }
      })
    }
  },
  _preventTouchMove: function() {

  },
  ready: function(options) {

  }
})
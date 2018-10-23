# image-cropper
一款人性化的图片剪裁的小程序插件，支持旋转支持旋转支持旋转
----
1.在需要使用插件的JSON文件中添加image-cropper<br>  
"usingComponents": {<br>  
    "image-cropper": "../plugin/image-cropper"<br>  
  },<br>  
2.wxml文件<br>  
<image-cropper id="cropper" min_scale="0.3" imgWidth="100%" width="{{width}}" height="{{height}}"></image-cropper><br>  
3.wxss文件末尾<br>  
@import '../plugin/image-cropper.wxss'<br>  
4.获取image-cropper对象<br>  
this.cropper = this.selectComponent("#cropper");<br>  

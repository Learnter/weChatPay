//app.js
import $http from "/common/httpRequest";
import $api from "/common/api";
App({
  globalData: {
    socketUrl: "wss://facepayapi.zguan.cn/wss",//自己的服务器网址
    firstSend:false, //是否为首次
    limit: 0, //重连次数
    intervalObj: null, //心跳定时器对象
    timer:null, //重连定时器对象
    clientData:"pong" //客户端发送的内容
  },

  onLaunch: function () {
    //获取青蛙设备号
    wxfaceapp.checkWxFacePayOsInfo({
      success(res) {
        wx.setStorageSync("serialNumber", res.osSerialNumber);
      },
      fail(res) {
       wx.showToast({
         icon:"none",
         title:"获取设备号失败,请联系开发人员!"
       })
      }
    })  
    this.linkSocket();
  },

  //建立websocket连接
  linkSocket() {
    var that = this
    wx.connectSocket({
      url: that.globalData.socketUrl,
      success() {
        let erialNum = wx.getStorageSync("serialNumber");
        that.globalData.clientData = { sn: erialNum, type: 1 };
        // that.globalData.clientData = "首次连接";
        that.initEventHandle();
        that.globalData.firstSend = true;
      }
    })
  },

  //绑定事件
  initEventHandle() {
    var that = this
    if (that.globalData.firstSend === false){
      wx.onSocketOpen(() => {
        that.globalData.intervalObj = setInterval(function () {
          that.timedSend();
        },30000)
      })


      wx.onSocketMessage((res) => {
        let serverData = JSON.parse(res.data)
        if (serverData && serverData.type == 1) {
          $http.POST($api.swiper.amountPay, { price: serverData.price }).then((res) => {
            if (res.data.code === 200) {
              // console.log(res.data);
              let { order_sn } = res.data;
              wxfaceapp.facePay({ //唤醒设备的刷脸支付流程
                requireFaceCode: true, //是否需要获取付款码返回给小程序
                success(res) {
                  if (res.replyCode == "0") { //唤醒刷脸成功
                    wxfaceapp.onFacePayPassEvent(function (success) { //监听刷脸成功
                      $http.POST($api.orderPay.alipy, { 'bar_code': success.faceCode, 'order_sn': order_sn }).then((res) => { //提交刷脸支付二维码及订单单号
                        if (res.data.code === 200) {
                          wx.showToast({
                            title: '支付成功!',
                          })
                        }
                      });
                    })
                    wxfaceapp.onFacePayFailedEvent(function (fail) { //监听刷脸失败
                      wx.showToast({
                        icon: 'none',
                        title: '刷脸失败!'
                      })
                    })
                  }
                },
                fail(res) { //刷脸唤醒失败
                  wx.showToast({
                    icon: 'none',
                    title: "刷脸唤醒失败!"
                  })
                }
              })
            }
          })
        }
      })

      wx.onSocketError((res) => {
        // console.log('WebSocket连接打开失败')
        that.reconnect();
      })

      wx.onSocketClose((res) => {
        // console.log('WebSocket 已关闭！')
        that.reconnect();
      })
    }
  },

  timedSend: function(){ //定时发送信息保持心跳
    let that = this;
    wx.sendSocketMessage({
      data: that.globalData.clientData,// 需要发送的内容
      success:function(){
        that.globalData.clientData = "pong";
      }
    });
  },

  reconnect:function(){ //网络错误重连
    var that = this;
    clearInterval(that.globalData.intervalObj);
    clearTimeout(that.globalData.timer);
    if(that.globalData.limit < 10){
      that.globalData.timer = setTimeout(function(){
          that.globalData.limit++;
          that.linkSocket();
      },30000);
    }
  }
})
//app.js
import $http from "/common/httpRequest";
import $api from "/common/api";
App({
  globalData: {
    socketUrl: "wss://facepayapi.zguan.cn/wss",//正式服务器网址
    // socketUrl: "wss://api.2020demo.jiafuw.com/wss",//测试服务器网址
    firstSend:false, //是否为首次
    limit: 0, //重连次数
    intervalObj: null, //心跳定时器对象
    timer:null, //重连定时器对象
    clientData:"pong", //客户端发送的内容
    cancelFormType:"" //取消的类型
  },

  onLaunch: function () {
    //获取青蛙设备号
    wxfaceapp.checkWxFacePayOsInfo({
      success:(res)=> {
        // console.log("成功获取青蛙设备号",res);
        wx.setStorageSync("serialNumber", res.osSerialNumber);
        // wx.setStorageSync("serialNumber", "TXAP11951002763ND002112")
        this.linkSocket();
      },
      fail:(res)=> {
       wx.showToast({
         icon:"none",
         title:"获取设备号失败,请联系开发人员!"
       })
      }
    })  
  },

  //建立websocket连接
  linkSocket() {
    wx.connectSocket({
      url: this.globalData.socketUrl,
      success:()=> {
        let erialNum = wx.getStorageSync("serialNumber");
        // console.log("设备号:",erialNum);
        this.globalData.clientData = { sn: erialNum, type: 1 };
        this.initEventHandle();
        this.globalData.firstSend = true;
        // console.log("socket开始链接");
      }
    })
  },

  //绑定事件
  initEventHandle() {
    if (this.globalData.firstSend === false){
      wx.onSocketOpen(() => {
        // console.log("websocket链接");
        this.globalData.intervalObj = setInterval(()=> {
          this.timedSend();
        },30000)
      })
      wx.onSocketMessage((res) => {
        let {order_sn,type,price,old_sn} = JSON.parse(res.data);
        if (type == 1 || type == 2) {
          switch(type){
            case 1: //商家端调用刷脸支付
              $http.POST($api.swiper.amountPay, { price:price }).then((res) => {
                if (res.data.code === 200) {
                  let {order_sn } = res.data.data;
                  this.upFacePay(order_sn,price,type);
                }
              })
             break;
            case 2: //web端调用刷脸支付
              this.upFacePay(order_sn,price,type,old_sn);
              break; 
          }       
        }
      })

      wx.onSocketError((res) => {
        // console.log('WebSocket连接打开失败');
        this.reconnect();
      })

      wx.onSocketClose((res) => {
        // console.log('WebSocket 已关闭！');
        this.reconnect();
      })
    }
  },

  timedSend: function(){ //定时发送信息保持心跳
    // console.log("我要发送信息咯",this.globalData.clientData);
    wx.sendSocketMessage({
      data: JSON.stringify(this.globalData.clientData),// 需要发送的内容
      success:()=>{
        this.globalData.clientData = "pong";
      }
    });
  },

  reconnect:function(){ //网络错误重连
    clearInterval(this.globalData.intervalObj);
    clearTimeout(this.globalData.timer);
    if(this.globalData.limit < 10){
      this.globalData.timer = setTimeout(()=>{
          this.globalData.limit++;
          this.linkSocket();
      },10000);
    }
  },

  upFacePay(ORDER_SN,PRICE,TYPE,OLD_SN){ //调用刷脸支付
    wxfaceapp.facePay({ //唤醒设备的刷脸支付流程
      requireFaceCode: true, //是否需要获取付款码返回给小程序
      success: (res) => {
        if (res.replyCode == "0") { //唤醒刷脸成功
          wxfaceapp.onFacePayPassEvent((success) => { //监听刷脸成功
            if(success.replyCode == 0){
              $http.POST($api.orderPay.alipy, { 'bar_code': success.faceCode, 'order_sn': ORDER_SN, type: "2" }).then((res) => { //提交刷脸支付二维码及订单单号
                if (res.data.code === 200) {
                  wx.showToast({
                    icon: "none",
                    title: '支付成功!'
                  })
                }
              });
            }else{
              let erialNum = wx.getStorageSync("serialNumber");
              let userCancel;
              if (TYPE == 1) { //商家端 用户取消
                userCancel = { sn: erialNum,type: 3};
              } else if (TYPE == 2) { //web端 用户取消
                userCancel = { sn: erialNum, type: 5, old_sn: OLD_SN};
              }
              wx.sendSocketMessage({ //通知服务器端用户取消操作
                data: JSON.stringify(userCancel),
                success:()=>{
                  console.log("已通知服务器用户取消");
                }
              });
              wx.showToast({
                title: '取消支付!',
                icon:"none"
              })
            }
          })
          wxfaceapp.onFacePayFailedEvent((fail) => { //监听刷脸失败
            wx.showToast({
              icon: 'none',
              title: '刷脸失败!'
            })
          })
        }
      },
      fail(res) { //刷脸唤醒失败
        wx.showToast({icon: 'none',title: "刷脸唤醒失败!"})
      }
    })
  }
})


import $http from "../../common/httpRequest";
import $api from "../../common/api";
Page({
  data: {
    list: [], //轮播数据
    amount: '' //价格
  },
  onLoad() {
    let data= wx.getStorageSync('storeName');
    wx.setNavigationBarTitle({
      title: data
    })
    this.fetchSwipers();
  },
  onShow() {
    // my.ix.onKeyEventChange((r) => { //监听键盘输入事件
    //   if (r.keyCode == 131) //键盘点击收款
    //     this.setData({ //赋值
    //       amount: r.amount
    //     })
    //   else if (r.keyCode == 133) { //键盘点击取消
    //     this.setData({
    //       amount: ''
    //     })
    //   } else if (r.keyCode == 132) { //键盘点击刷脸
    //     this.facePay();
    //   } else if (r.keyCode == 134) { //键盘点击设置
    //     my.ix.startApp({
    //       appName: 'settings'
    //     });
    //   }
    // });
  },
  onHide() {
    // my.ix.offKeyEventChange(); //关闭键盘监听事件
  },
  fetchSwipers() { //获取首页轮播
    $http.POST($api.swiper.homeSwiper, {
      type: 1
    }).then((res) => {
      if (res.data.code === 200) {
        this.setData({
          list: res.data.data
        })
      }
    })
  },
  inputOnBlur(e) { //输入框失去焦点
    let {
      value
    } = e.detail;
    this.setData({
      amount: value
    })
  },
  facePay: function() { //扫脸支付
    let {
      amount
    } = this.data;
    if (!amount) return wx.showToast({
      icon: 'none',
      title: '请先输入付款金额'
    });
    $http.POST($api.swiper.amountPay, {
      price: amount,
      type: 2
    }).then((res) => {
      if (res.data.code === 200) {
        // wx.showToast({icon: 'none',title: '刷脸请求后端返回订单号!'})
        let {order_sn} = res.data.data;
        wxfaceapp.facePay({ //唤醒设备的刷脸支付流程
          requireFaceCode: true, //是否需要获取付款码返回给小程序
          success: (res) => {
            if (res.replyCode == "0") { //唤醒刷脸成功
              wxfaceapp.onFacePayPassEvent((success) => { //监听刷脸成功
                if (success.replyCode == 0) {
                  $http.POST($api.orderPay.alipy, {
                    'bar_code': success.faceCode,
                    'order_sn': order_sn,
                    type: "2"
                  }).then((res) => { //提交刷脸支付二维码及订单单号
                    if (res.data.code === 200) {
                      wx.showToast({
                        icon: 'success',
                        title: '支付成功!'
                      })
                      this.setData({ //清空数据
                        amount: ''
                      })
                    } else {
                      wx.showToast({
                        icon: 'none',
                        title: res.data.msg
                      });
                    }
                  });
                }else{
                  wx.showToast({icon: 'none',title: '取消支付'})
                  this.setData({ //清空数据
                    amount: ''
                  })
                }
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
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  codePay() { //扫码支付
    let {
      amount
    } = this.data;
    if (!amount) return wx.showToast({
      icon: 'none',
      title: '请先输入付款金额'
    });
    $http.POST($api.swiper.amountPay, {
      price: amount
    }).then((res) => {
      if (res.data.code === 200) {
        let {
          order_sn
        } = res.data.data;
        wxfaceapp.listenCodePayment({ //注册设备扫码
          success: (res) => {
            wx.showToast({
              title: "请出示付款码",
              icon: "none"
            });
            wxfaceapp.onCodePayEvent((res) => { //被扫码回调事件
              if (res.replyCode == "0") {
                $http.POST($api.orderPay.alipy, {
                  'bar_code': res.code,
                  'order_sn': order_sn,
                  type: "1"
                }).then((res) => { //提交刷脸支付二维码及订单单号
                  if (res.data.code === 200) {
                    wx.showToast({
                      icon: 'success',
                      title: '支付成功!'
                    });
                    this.setData({ //清空数据
                      amount: ''
                    })
                  } else {
                    wx.showToast({
                      icon: 'none',
                      title: res.data.msg
                    });
                  }
                });
              } else {
                wx.showToast({ icon: 'none', title: '取消支付' })
                this.setData({ //清空数据
                  amount: ''
                })
              }
            })
          }
        })
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  }
});
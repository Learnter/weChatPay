import $http from "../../common/httpRequest";
import $api from "../../common/api";
Page({
  reConfig: {
    cate_id: '',
    page: 0,
    page_num: 10
  },
  data: {
    isEmpty: false,//是否列表为空
    isLoadEnd: false,//是否已经加载完
    swipeIndex: null,
    right: [{ type: 'delete', text: '删除' }],
    spdpopup: false,//规格弹窗
    gwcpopup: false,//购物车弹窗
    categoryList: [], //左边分类
    subCategoryList: [],//右边分类
    spec_data: [],//规格参数列表
    garnish: [],//规格附加列表
    cardsList: [],//购物车列表
    activeGood: '',//激活的商品id
    activeGoodsName: '',//激活的商品名字
    active_good_num: 1,//激活商品的数量
    active_init_price: 0,//激活规格的初始化价格
    active_total_price: 0,//激活规格的总价格
    active_spec_data: [],//激活的规格选项列表
    appendList: [51],//激活的附加项id
    height: 0,
    categoryActive: 0,
    scrollTop: 0,
    cardSumNum: 0,//总购物数
    cardSumMoney: 0 //总购物金额
  },
  scroll(e) { //监听滚动高度
    this.setData({
      'scrollHeight': e.detail.scrollHeight
    });
  },
  categoryClickMain(event) { //切换左边分类列表
    let { item, index } = event.target.dataset;
    this.reConfig.cate_id = item.cate_id;
    this.reConfig.page = 0;
    this.setData({
      isLoadEnd: false,
      isEmpty: false,
      categoryActive: index,
      scrollTop: -this.data.scrollHeight * index
    })
    this.getCategoryRight();
  },
  getCategory() { //获取左边分类列表
    $http.POST($api.orderPay.cateLeft).then((res) => {
      if (res.data.code === 200) {
        this.reConfig['cate_id'] = res.data.data[0].cate_id;
        this.setData({
          categoryList: res.data.data
        })
        this.getCategoryRight();
      }
    })
  },
  getCategoryRight() { //获取右边商品列表
    wx.showLoading({
      title: '加载中...'
    })
    $http.POST($api.orderPay.cateRight, this.reConfig).then((res) => {
      setTimeout(() => {
        wx.hideLoading();
      }, 500)
      if (res.data.code === 200) {
        if (res.data.data.length < this.reConfig.page_num) { //判断是否加载完数据
          this.setData({
            isLoadEnd: true
          })
        }
        this.setData({
          subCategoryList: res.data.data
        })
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  chooseType(e) { //选择规格
    let { goodid, goodname, goodprice } = e.target.dataset;
    $http.POST($api.orderPay.specification, { goods_id: goodid }).then((res) => {
      if (res.data.code === 200) {
        let activeSpecItem = [];
        if (Object.keys(res.data.data).length !== 0) {
          let { spec_data, garnish } = res.data.data; //对象解构
          spec_data.forEach((item) => { //默认选中第一个
            item.items[0].selected = true;
            activeSpecItem.push(item.items[0].id);
          })
          this.setData({ //赋值
            spdpopup: true,
            activeGoodsName: goodname,
            activeGood: goodid,
            garnish: garnish,
            'spec_data': spec_data,
            'active_spec_data': activeSpecItem
          });
        } else {
          this.setData({ //赋值
            spdpopup: true,
            activeGoodsName: goodname,
            activeGood: goodid,
            garnish: [],
            'active_init_price': goodprice * 1,
            'active_total_price': goodprice * 1,
            'spec_data': [],
            'active_spec_data': []
          });
        }
        if (activeSpecItem.length > 0) {
          this.fetchSpecMoney(goodid, activeSpecItem.join("_"));
        }
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  selspec(e) { //选择规格列表
    let { parentindex, index, childitem } = e.target.dataset;//对象解构
    let { spec_data, active_spec_data, appendList } = this.data;
    active_spec_data[parentindex] = childitem.id; //根据父索引赋值新的规格id
    spec_data[parentindex].items.forEach((item) => { //激活新的选项、取消旧的选项
      item.id === childitem.id ? item.selected = true : item.selected = false;
    });
    this.fetchSpecMoney(this.data.activeGood, active_spec_data.join("_")); //动态获取商品规格价格

    this.setData({
      'spec_data': spec_data,
      appendList: []
    })
  },
  selAppendList(e) { //选择附加列表
    let { appenditem } = e.target.dataset;
    let { appendList, active_total_price, active_good_num } = this.data;
    // console.log(appendList);

    if (appendList.indexOf(appenditem.id) == -1) { //添加、减少附加参数逻辑
      appendList.push(appenditem.id);
      active_total_price += appenditem.shop_price * active_good_num;
    } else {
      appendList.splice(appendList.indexOf(appenditem.id), 1);
      active_total_price -= appenditem.shop_price * active_good_num;
    }
    this.setData({ //重新赋值渲染数据
      'active_total_price': active_total_price,
      appendList: appendList
    })
  },
  callBackFn(childProp) { //选择数量
    let { active_init_price, appendList, garnish } = this.data;
    let totalPrice = active_init_price * childProp.detail;
    garnish.forEach((item) => {
      appendList.indexOf(item.id) !== -1 ? totalPrice += item.shop_price * childProp.detail : '';
    });
    this.setData({
      'active_good_num': childProp.detail,
      'active_total_price': totalPrice
    })
  },
  fetchSpecMoney(goodsId, specIds) { //获取规格金额
    let { active_good_num } = this.data;
    $http.POST($api.orderPay.price, { 'goods_id': goodsId, 'spec_ids': specIds }).then((res) => {
      if (res.data.code === 200) {
        if (res.data.data) {
          let { shop_price } = res.data.data;
          this.setData({
            'active_init_price': shop_price,
            'active_total_price': shop_price * active_good_num
          })
        }
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  addGoodsget() { //添加购物车
    let { active_good_num, active_spec_data, appendList, activeGood } = this.data;
    let config = { 'goods_id': activeGood, 'goods_num': active_good_num, 'item_key': active_spec_data.join("_"), garnish: appendList.join() };
    // my.showLoading({ content: '提交中...' });
    $http.POST($api.orderPay.addCart, config).then((res) => {
      // my.hideLoading();
      if (res.data.code === 200) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        this.setData({
          'active_good_num': 1,
          spdpopup: false,
          appendList: []
        })
        this.fetchCardsList();
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  fetchCardsList() { //获取购物车列表
    $http.POST($api.orderPay.cartList).then((res) => {
      if (res.data.code === 200) {
        if (res.data.data) {
          let cardsList = res.data.data.list;
          // console.log(res,this.data.cardsList);
          let sumMoney = 0, sumNum = 0;
          if (cardsList) {
            sumNum = cardsList.length;
            cardsList.forEach((item) => {
              sumMoney += (item.amount * item.goods_num);
            });
          } else {
            this.setData({
              gwcpopup: false
            })
          }
          this.setData({
            cardsList: cardsList || [],
            cardSumNum: sumNum || 0,
            cardSumMoney: sumMoney
          })
        }
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  onSwipeStart(e) { //隐藏其他删除滑动框
    this.setData({
      swipeIndex: e.index,
    });
  },
  onRightItemClick(e) { //删除购物车列表
    let { extra } = e;
    $http.POST($api.orderPay.deleteCart, { 'goods_id': extra.goods_id }).then((res) => {
      if (res.data.code === 200) {
        wx.showToast({ title: '商品删除成功' });
        this.setData({ //隐藏删除滑动框
          swipeIndex: null
        })
        this.fetchCardsList();
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  changeCardNumber(childProp) { //增减购物车数量
    let {index,item} = childProp.target.dataset;
    let dynamicType = childProp.detail > item.goods_num ? 1 : 2; //判断是增加还是减少操作
    $http.POST($api.orderPay.changeNum, { id: item.id, type: dynamicType }).then((res) => {
      if (res.data.code === 200) {
        this.fetchCardsList();
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  clickClearCards() { //点击清空购物车
    let { cardsList } = this.data;
    if (cardsList.length === 0)
      return wx.showToast({
        title: '亲!空空如也'
      });
    wx.showModal({
      title: '温馨提示',
      content: '您确认要清空列表吗?',
      confirmText: '确定',
      cancelText: '取消',
      success: (result) => {
        if (result.confirm) {
          this.clearCards();
        }
      },
    });
  },
  toSum() { //结算 ----重点 调用支付宝刷脸付逻辑
    if (!this.data.cardSumMoney) return wx.showToast({icon:"none", title: '购物车为空' });
    wx.showToast({
      icon: "none",
      title: '需要配合青蛙设备使用!',
    })
    // $http.POST($api.orderPay.createOrder, { type: 1 }).then((res) => { //获取后台商品订单号
    //   if (res.data.code === 200) {
       
    //     my.ix.startApp({
    //       appName: 'cashier',
    //       bizNo: res.data.data.order_sn,
    //       totalAmount: res.data.data.order_amount.toString(),
    //       success: (r) => {
    //         $http.POST($api.orderPay.alipy, { 'bar_code': r.barCode, 'order_sn': r.bizNo }).then((res) => { //提交刷脸支付二维码及订单单号
    //           if (res.data.code === 200) {
    //             this.setData({ //清空数据
    //               gwcpopup: false,
    //               cardSumNum: 0,
    //               cardSumMoney: 0,
    //               cardsList: []
    //             })
    //           } else {
    //             wx.showToast({
    //               icon: 'none',
    //               title: res.data.msg
    //             });
    //           }
    //         });
    //       },
    //       fail: (cancel) => { //支付失败或用户点击取消,清空购物车数据
    //         // my.confirm({
    //         //   title: cancel.errorMessage,
    //         //   content: '您需要清空购物车吗?',
    //         //   confirmButtonText: '确定',
    //         //   cancelButtonText: '取消',
    //         //   success: (result) => {
    //         //     if (result.confirm) {
    //         this.clearCards();
    //         //     }
    //         //   },
    //         // });
    //       }
    //     });
    //   } else {
    //     wx.showToast({
    //       icon: 'none',
    //       title: res.data.msg
    //     });
    //   }
    // })
  },
  loadMore() { //加载更多
    if (this.data.isLoadEnd) return;
    wx.showLoading({
      title: '加载中...'
    })
    this.reConfig.page++;
    $http.POST($api.orderPay.cateRight, this.reConfig).then((res) => {
      setTimeout(() => {
        wx.hideLoading();
      }, 500)
      if (res.data.code === 200) {
        if (res.data.data.length < this.reConfig.page_num) { //判断是否加载完数据
          this.setData({
            isLoadEnd: true
          })
        }
        this.setData({
          'subCategoryList': this.data.subCategoryList.concat(res.data.data)
        })
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },

  watchCards() { //打开、关闭购物车弹窗
    let { cardsList } = this.data;
    if (cardsList.length === 0)
      return wx.showToast({
        title: '亲!请添加商品',
        icon:'none'
      });
    this.setData({
      gwcpopup: !this.data.gwcpopup
    })
  },
  closeSpecMask() { //关闭商品规格弹窗
    this.setData({
      spdpopup: false,
      'active_good_num': 1,
      'active_spec_data': []
    })
  },
  clearCards() { //清空购物车数据
    $http.POST($api.orderPay.clearCart).then((res) => {
      if (res.data.code === 200) {
        this.setData({ //清空数据
          gwcpopup: false,
          cardSumNum: 0,
          cardSumMoney: 0,
          cardsList: []
        })
      } else {
        wx.showToast({
          icon: 'none',
          title: res.data.msg
        });
      }
    })
  },
  onLoad(query) {
    let storeName = wx.getStorageSync("storeName");
    wx.setNavigationBarTitle({
      title: '商品页面',
    })
    // 页面加载
    this.getCategory();
    this.data.height = wx.getSystemInfoSync().windowHeight;
  },
  onReady() {
    // 页面加载完成
  },
  onShow() {
    // 页面显示
  },
  onHide() {
    // 页面隐藏
  },
  onUnload() {
    // 页面被关闭
  },
  onTitleClick() {
    // 标题被点击
  },
  onPullDownRefresh() {
    // 页面被下拉
  },
  onReachBottom() {
    // 页面被拉到底部
  }
});
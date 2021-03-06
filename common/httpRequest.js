let BASEURL = 'https://facepayapi.zguan.cn/v1/customer/';
// let BASEURL = 'https://api.huiqinsoft.cn/v1/customer/';
const POST = function(Url, Data, Token) {
  //获取唯一设备号,并请求后端
  let serialNum = wx.getStorageSync("serialNumber");
  let newData = Data;
  Data ? newData = Object.assign(Data, {sn: serialNum}) : newData = Object.assign({}, {sn: serialNum});
  //获取唯一设备号,并请求后端
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASEURL + Url,
      method: 'POST',
      data: newData,
      success: function(result) {
        resolve(result);
      },
      fail: function(result) {
        wx.showToast({
          icon:"none",
          title: '服务器数据请求失败'
        });
      }
    });
  })
}

module.exports = {
  POST: POST
}
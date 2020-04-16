// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

let totalMoney = 0;
let totalOrder = 0;
let orderStatusSuccess = 0;
let orderStatusCancel = 0;
let orderStatusOther = 0;
let transactionTimeline = {};
let labelTimelines = [];
let firstOrderDate;
let brandData = {};
let categoryData = {};
let sellerData = {};
let topSeller = {};
let topCategory = {};
let topItemOrder = {
  price: 0,
  name: '',
  code: '',
  orderDate: null
};

class Tiki {
  constructor() {
  }
  getMyProfile(callback) {
    $.ajax({
      url: "https://tiki.vn/api/v2/me",
      type: "GET",
      success: function (res) {
        if (res != undefined) {
          callback(null, { name: res.name, created_date: res.created_date });
        } else {
          callback(new Error('No Login'), null)
        }
      },
      error: function (request, status, error) {
        callback(error, null)
      },
    });
  }

  startCollectData(callback) {

    if (localStorage["tikiData"] != undefined && localStorage['saveDate'] != undefined && moment().diff(moment(localStorage['saveDate']), 'days') == 0) {
      let datas = JSON.parse(localStorage["tikiData"]);
      setTimeout(function () {
        callback(null, datas);
      }, 300);
    } else {
      this.getOrder(function (err, datas) {
        localStorage["tikiData"] = JSON.stringify(datas);
        localStorage['saveDate'] = moment().format();
        callback(err, datas);
      });
    }
  }
  getOrder(callback) {
    var running = function (page, cb) {
      console.log('page', page);
      $.ajax({
        url: `https://tiki.vn/api/v2/me/orders?page=${page}&limit=100&include=items,price_summary`,
        type: "GET",
        success: function (res) {
          cb(null, res.data, res.paging);
        },
        error: function (request, status, error) {
          cb(error, null, null)
        },
      });
    }

    let datas = [];
    let page = 1;

    var cb = function (err, data, paging) {
      if (err) {
        callback(err, null)
      } else {
        datas = datas.concat(data);
        if (paging.current_page == paging.last_page) {
          callback(null, datas)
        } else {
          page++
          running(page, cb)
        }
      }
    }
    running(page, cb)
  }
}

function processDatas(datas) {
  let today = moment();
  let lastData = datas[datas.length - 1];
  let beginDate = moment(lastData.created_at * 1000);
  firstOrderDate = moment(lastData.created_at * 1000);

  do {
    let key = beginDate.format("MMM YYYY");
    labelTimelines.push(key);
    transactionTimeline[key] = {
      order: 0,
      fee: 0,
    };
    beginDate = moment(beginDate).add(1, "M");
  } while (beginDate.isBefore(today));

  datas.forEach((data) => {
    if (data.status === "hoan_thanh") {
      totalMoney += data.grand_total;
      orderStatusSuccess++;

      //timeline
      let key = moment(data.created_at * 1000).format("MMM YYYY");
      if (transactionTimeline[key] != undefined) {
        transactionTimeline[key].order += 1;
        transactionTimeline[key].fee += data.grand_total;
      }

      data.items.forEach(item => {

        //topItemOrder
        if (topItemOrder.price <= item.grand_total) {
          topItemOrder.price = item.grand_total;
          topItemOrder.name = item.product_name;
          topItemOrder.orderDate = moment(data.created_at * 1000);
          topItemOrder.code = data.code;
        }

        //brand
        if (item.brand) {
          if (brandData[item.brand] != undefined) {
            brandData[item.brand].count++;
          } else {
            brandData[item.brand] = {
              name: item.brand,
              count: 1
            }
          }
        }
        //category
        if (categoryData[item.product_catalog_group_name] != undefined) {
          categoryData[item.product_catalog_group_name].count++;
        } else {
          categoryData[item.product_catalog_group_name] = {
            name: item.product_catalog_group_name,
            count: 1
          }
        }
        //seller
        if (item.current_seller) {
          if (sellerData[item.current_seller.id] != undefined) {
            sellerData[item.current_seller.id].count++;
          } else {
            sellerData[item.current_seller.id] = {
              name: item.current_seller.name,
              count: 1
            }
          }
        }
      })
    } else if (data.status === "canceled") {
      orderStatusCancel++;
    } else {
      orderStatusOther++;
    }
  });

  totalOrder = datas.length;
}

function showChartOrder() {

  var options = {
    series: [orderStatusSuccess, orderStatusCancel],
    labels: ["Thành công", "Hủy"],
    title: {
      text: "Đơn hàng",
      align: 'center'
    },
    chart: {
      type: 'donut',
      height: 250,
    },
    responsive: [{
      breakpoint: 400,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  var chart = new ApexCharts(document.getElementById("chartOrder"), options);
  chart.render();
}

function showChartCategory() {

  let datas = [];
  let labels = [];
  let categorys = Object.values(categoryData);
  categorys.sort((a, b) => b.count - a.count)

  topCategory = categorys[0];

  for (let category of categorys) {
    datas.push(category.count);
    labels.push(category.name);
  }

  var options = {
    series: datas,
    labels: labels,
    title: {
      text: "Danh mục",
      align: 'center'
    },
    chart: {
      type: 'donut',
      height: 250,
    },
    responsive: [{
      breakpoint: 400,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  var chart = new ApexCharts(document.getElementById("chartCategory"), options);
  chart.render();
}

function showChartBrand() {

  let datas = [];
  let labels = [];
  let brands = Object.values(brandData);
  brands.sort((a, b) => b.count - a.count)

  for (let brand of brands) {
    datas.push(brand.count);
    labels.push(brand.name);
  }

  var options = {
    series: datas,
    labels: labels,
    title: {
      text: "Nhãn hiệu",
      align: 'center',
    },
    chart: {
      type: 'donut',
      height: 250,
    },
    responsive: [{
      breakpoint: 400,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  var chart = new ApexCharts(document.getElementById("chartBrand"), options);
  chart.render();
}

function showChartSeller() {

  let datas = [];
  let labels = [];
  let sellers = Object.values(sellerData);
  sellers.sort((a, b) => b.count - a.count)

  topSeller = sellers[0];

  for (let seller of sellers) {
    datas.push(seller.count);
    labels.push(seller.name);
  }

  var options = {
    series: datas,
    labels: labels,
    title: {
      text: "Nhà cung cấp",
      align: 'center'
    },
    chart: {
      type: 'donut',
      height: 250,
    },
    responsive: [{
      breakpoint: 400,
      options: {
        chart: {
          width: 100
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  var chart = new ApexCharts(document.getElementById("chartSeller"), options);
  chart.render();
}

function showChartTimeline() {
  let orders = [];
  let fees = [];
  for (let key of labelTimelines) {
    let timeline = transactionTimeline[key];
    orders.push(timeline.order);
    fees.push(timeline.fee);
  }

  var options = {
    series: [{
      name: 'Order',
      type: 'column',
      data: orders
    }, {
      name: 'Amount',
      type: 'line',
      data: fees
    }],
    title: {
      text: "Lịch sử giao dịch",
      align: 'center'
    },
    chart: {
      toolbar: {
        show: false
      },
      height: 500,
      type: 'line',
    },
    stroke: {
      width: [0, 3],
      curve: 'smooth'
    },
    dataLabels: {
      enabled: false,
      enabledOnSeries: [1]
    },
    labels: labelTimelines,
    tooltip: {
      shared: true,
      intersect: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        if (seriesIndex == 1) {
          return formatCurrency(series[seriesIndex][dataPointIndex])
        }
        return '<span>' + series[seriesIndex][dataPointIndex] + '</span>'
      }
    },
    xaxis: {
      type: 'datetime'
    },
    yaxis: [{
      title: {
        text: 'Đơn hàng',
      },
    }, {
      opposite: true,
      labels: {
        formatter: function (value) {
          return formatCurrency(value);
        }
      },
      title: {
        text: 'Tiền'
      }
    }]
  };

  var chart = new ApexCharts(document.getElementById("chartTimeline"), options);
  chart.render();
}

function setChildTextNode(elementId, text) {
  document.getElementById(elementId).innerHTML = text;
}

function showLogin() {
  alert("Bạn chưa đăng nhập tiki. Đến trang tiki.vn đăng nhập và quay lại nhé :)");
  window.open("https://tiki.vn/");
}

function showInfo() {
  setChildTextNode(
    "firstOrder",
    `Ngày đơn hàng đầu tiên: <b>${firstOrderDate.format("DD MMM YYYY")}</b>`
  );
  setChildTextNode(
    "topItemOrder",
    `Chi nhiều nhất <b>${formatCurrency(topItemOrder.price)}</b> cho <a href='https://tiki.vn/sales/order/view/${topItemOrder.code}'target="_blank">${topItemOrder.name}</a> vào ngày <b>${topItemOrder.orderDate.format("DD MMM YYYY")}</b>`
  );
  setChildTextNode("totalOrder", `Số đơn hoàn tất: <b>${orderStatusSuccess}</b>`);
  setChildTextNode("totalAmount", `Tổng tiền: <b>${formatCurrency(totalMoney)}</b>`);
  setChildTextNode("topCategory", `Top danh mục: <b>${topCategory.name}</b>`);
  setChildTextNode("topSeller", `Top nhà cung cấp: <b>${topSeller.name}</b>`);

}

function stopLoading() {
  $('body').addClass('loaded');
  $('h1').css('color', '#222222');
}

let tiki = new Tiki();

//Page Load
(function pageLoad() {
  tiki.getMyProfile(function (err, info) {
    if (err) {
      showLogin();
    } else {

      let accountCreatedAt = moment(info.created_date * 1000).format("DD MMM YYYY")
      setChildTextNode("wellcome", `Xin chào, ${info.name}`);
      setChildTextNode("accountCreatedAt", `Ngày tạo tài khoản: <b>${accountCreatedAt}</b>`);

      tiki.startCollectData(function (err, datas) {
        stopLoading();
        if (err) {
          alert("Ooop.Something is wrong.");
        } else {
          if (datas.length > 0) {
            processDatas(datas);

            showChartOrder();
            showChartCategory();
            showChartBrand();
            showChartSeller()
            showChartTimeline();
            showInfo();

          }
        }
      });
    }
  });
})();
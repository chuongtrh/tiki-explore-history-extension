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

function startCollectData(callback) {
  if (localStorage["tikiData"] != undefined) {
    let res = JSON.parse(localStorage["tikiData"]);
    setTimeout(function () {
      stopLoading();
      callback(res.data, res.paging);
    }, 300);
  } else {
    $.ajax({
      url: "https://tiki.vn/api/v2/me/orders?page=1&limit=100&include=items,price_summary",
      type: "GET",
      success: function (res) {
        localStorage["tikiData"] = JSON.stringify(res);
        callback(res.data, res.paging);
      },
      error: function (request, status, error) {
        alert("Ooop.Something is wrong.");
      },
    });
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
        if (categoryData[item.product_root_category_id] != undefined) {
          categoryData[item.product_root_category_id].count++;
        } else {
          categoryData[item.product_root_category_id] = {
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

  //   console.log("totalMoney", totalMoney);
  //   console.log("totalOrder", totalOrder);
  //   console.log("orderStatusSuccess", orderStatusSuccess);
  //   console.log("orderStatusCancel", orderStatusCancel);
  //   console.log("orderStatusOther", orderStatusOther);
  //   console.log("transactionTimeline", transactionTimeline);
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
  categorys.sort((a, b) => a.count - b.count)

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
  brands.sort((a, b) => a.count - b.count)

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
  sellers.sort((a, b) => a.count - b.count)

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
      width: [0, 4],
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

  // new Chart(document.getElementById("chartTimeline"), {
  //   type: "bar",
  //   data: {
  //     labels: labelTimelines,
  //     datasets: [
  //       {
  //         label: "Order",
  //         data: orders,
  //         borderColor: "rgba(255, 99, 132, 1)",
  //         backgroundColor: "rgba(255, 99, 132, 0.5)",
  //         yAxisID: "y-axis-1",
  //         order: 2,
  //       },
  //       {
  //         label: "Amount",
  //         data: fees,
  //         type: "line",
  //         fill: false,
  //         borderColor: window.chartColors.blue,
  //         yAxisID: "y-axis-2",
  //         order: 1,
  //       },
  //     ],
  //   },
  //   options: {
  //     responsive: true,
  //     scales: {
  //       yAxes: [
  //         {
  //           type: "linear", // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
  //           display: true,
  //           position: "left",
  //           id: "y-axis-1",
  //         },
  //         {
  //           type: "linear", // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
  //           display: true,
  //           position: "right",
  //           id: "y-axis-2",

  //           // grid line settings
  //           gridLines: {
  //             drawOnChartArea: false, // only want the grid lines for one axis to show up
  //           },
  //           ticks: {
  //             callback: function (value) {
  //               return formatCurrency(value);
  //             },
  //           },
  //         },
  //       ],
  //     },
  //     tooltips: {
  //       callbacks: {
  //         label: function (t, d) {
  //           var xLabel = d.datasets[t.datasetIndex].label;
  //           var yLabel = t.yLabel;
  //           if (t.datasetIndex === 0) return xLabel + ": " + yLabel;
  //           else if (t.datasetIndex === 1)
  //             return xLabel + ": " + formatCurrency(yLabel);
  //         },
  //       },
  //     },
  //     title: {
  //       display: true,
  //       text: "Dòng thời gian",
  //     },
  //   },
  // });
}

function getMyProfile(callback) {
  $.ajax({
    url: "https://tiki.vn/api/v2/me",
    type: "GET",
    success: function (res) {
      if (res != undefined) {
        let name = res.name;
        callback(name);
      } else {
        showLogin();
      }
    },
    error: function (request, status, error) {
      alert("Ooop.Something is wrong.");
    },
  });
}

function setChildTextNode(elementId, text) {
  document.getElementById(elementId).innerHTML = text;
}

function showLogin() {
  alert("You need to login Tiki. Go to tiki.vn");
  window.open("https://tiki.vn/");
}

function showInfo() {
  setChildTextNode(
    "firstOrder",
    `Ngày đơn hàng đầu tiên: <b>${firstOrderDate.format("DD MMM YYYY")}</b>`
  );
  setChildTextNode("totalOrder", `Số đơn hoàn tất: <b>${orderStatusSuccess}</b>`);
  setChildTextNode("totalAmount", `Tổng tiền: <b>${formatCurrency(totalMoney)}</b>`);
}

function stopLoading() {
  $('body').addClass('loaded');
  $('h1').css('color', '#222222');
}
function pageLoad() {
  getMyProfile(function (name) {
    setChildTextNode("wellcome", `Xin chào, ${name}`);
    startCollectData(function (datas, paging) {
      stopLoading();
      processDatas(datas);
      showInfo();
      showChartOrder();
      showChartCategory();
      showChartBrand();
      showChartSeller()
      showChartTimeline();
    });
  });
}

pageLoad();




$.ajax({
    url: '/sales_report',
    type: 'GET',
    success: function (data) {
        // Total Sales
        $('#total-sales, #main-total-sales').text(data.total_sales);
        let thisMonthSales = data.sales_by_month[data.sales_by_month.length - 1].total_sales
        $('#current-month-sales').text(thisMonthSales);
        let prevMonthSales = data.sales_by_month[data.sales_by_month.length - 2].total_sales
        $('#prev-month-sales').text(prevMonthSales ? prevMonthSales : 0);

        // Sales by Month
        let salesByMonthTable = $('#sales-by-month-table tbody');
        let months = []
        let totalSales = []
        data.sales_by_month.forEach(function (item) {
            s = data.sales_growth_rate.find(function (sale) {
                return sale.month == item.month
            });
            salesByMonthTable.append('<tr><td>' + item.month + '</td><td class="currency">'
                + item.total_sales + '</td>' + '<td>'
                + item.invoice_count + '</td>' + '<td class="growth">'
                + Math.floor(s.growth_rate * 100) + ' %'
                + '</td></tr>');
            months.push(item.month);
            totalSales.push(item.total_sales);
        });
        // Sales by Customer
        let salesByCustomerTable = $('#sales-by-customer-table tbody');
        data.sales_by_customer.forEach(function (item) {
            salesByCustomerTable.append('<tr><td>' + item.customer + '</td><td class="fw-bold fs-5 currency">' + item.total + '</td></tr>');
        });
        // Details of invoices
        // Mapping of English terms to Arabic terms
        const arabicTranslations = {
            'count': 'العدد الكلي',
            'mean': 'متوسط المبيعات',
            'min': 'قيمة أدنى وصل',
            'max': 'قيمة أقصى وصل',
        };
        let invoicesDetails = $('#invoices-details');
        data.sales_distribution.forEach(function (item, i) {

            // Translate the statistic term to Arabic
            let arabicTerm = arabicTranslations[item.index] || item.index;
            // Append the translated term and value to the HTML
            i == 0 ? invoicesDetails.append('<div class=" p-2"><p class="fs-5">' + arabicTerm + '</p><p class="fw-bold fs-4 text-end my-0">' + item.total + ' وصل</p><hr class="my-1"></div>')
                : invoicesDetails.append('<div class=" p-2"><p class="fs-5">' + arabicTerm + '</p><p class="fw-bold fs-4 text-end my-0 currency">' + item.total + '</p><hr class="my-1"></div>');
        });
        formatCurrency();
        let lang = {
            "sProcessing": "جارٍ التحميل...",
            "sLengthMenu": "عرض _MENU_",
            "sZeroRecords": "لم يتم العثور على أية بيانات",
            "sInfo": "عرض _START_ إلى _END_ من أصل _TOTAL_ وصل",
            "sInfoEmpty": "يعرض 0 إلى 0 من أصل 0 ",
            "sInfoFiltered": "(منتقاة من المجموع _MAX_ )",
            "sInfoPostFix": "",
            "sSearch": "البحث:",
            "sUrl": "",
            "oPaginate": {
                "sFirst": "الأولى",
                "sPrevious": "السابق",
                "sNext": "التالي",
                "sLast": "الأخيرة"
            }
        }
        $('#total-customers').text(data.sales_by_customer.length)
        let table = new DataTable('#sales-by-customer-table', {
            responsive: true,
            title: 'customers list',
            order: [[0, 'asc']],
            searching: false,
            lengthChange: false, // Show the entries select
            info: false, // Hide the "Showing X to Y of Z entries" text
            // lengthMenu: [5, 10, 25, 30, 35, 50], // Customize the available entries per page
            pageLength: 6, // Default number of entries to show per page
            // paging: false,
            language: lang
        })


        // assign datatable for monthly
        let monthlyTable = new DataTable('#sales-by-month-table', {
            searching: false,
            ordering: false,
            lengthChange: false, // Show the entries select
            info: false,
            language: lang,
            pageLength: 6,
        })



        // Top Products Chart (Uncomment if top_products data is available)
        let topProductsCtx = $('#top-products');
        let products = []
        let sales = []
        let percentages = []
        data.top_products.forEach(function (item) {
            products.push(item.radical_name);
            sales.push(item.sales);
            percentages.push(item.sales_percentage.toFixed(2))
        });
        Chart.defaults.font.size = 16;
        new Chart(topProductsCtx, {
            type: 'doughnut',
            data: {
                labels: products,
                datasets: [{
                    label: 'نسبة المبيعات',
                    data: percentages,
                    hoverOffset: 6
                }]
            }
        });
        // set top product
        const topProductBySales = data.top_products.reduce(function (prev, current) {
            return (prev.sales > current.sales) ? prev : current;
        });
        $('#top-product').text(topProductBySales.name)
        // monthly chart
        let growthList = data.sales_growth_rate.map((item) => Math.floor(item.growth_rate * 100));
        const ctx = document.getElementById('monthly-chart');
        // growth mean
        let growthMean = growthList.reduce((prv, current) => (prv + current) / 2, 0);
        $('#growth-mean, #main-growth').text(growthMean + ' %')
        new Chart(ctx, {
            data: {
                labels: months,
                datasets: [{
                    type: 'bar',
                    label: 'حجم المبيعات', // Sales Volume
                    data: totalSales,
                    borderWidth: 1,
                    yAxisID: 'y', // Assign this dataset to the first Y axis
                    backgroundColor: [
                        'rgba(255, 5, 22, 0.5)', // January
                        'rgba(54, 162, 235, 0.5)', // February
                        'rgba(255, 206, 86, 0.5)', // March
                        'rgba(75, 192, 192, 0.5)', // April
                        'rgba(153, 102, 255, 0.5)', // May
                        'rgba(255, 159, 64, 0.5)', // June
                        'rgba(255, 99, 132, 0.5)', // July
                        'rgba(54, 162, 235, 0.5)', // August
                        'rgba(255, 206, 86, 0.5)', // September
                        'rgba(75, 192, 192, 0.5)', // October
                        'rgba(153, 102, 255, 0.5)', // November
                        'rgba(255, 159, 64, 0.5)'  // December
                    ],
                    borderColor: 'rgba(54, 162, 235, 1)'
                }, {
                    type: 'line',
                    label: 'نسبة النمو', // Growth Rate
                    data: growthList,
                    borderWidth: 1,
                    yAxisID: 'y1', // Assign this dataset to the second Y axis
                    borderColor: 'rgba(0, 0, 150, 1)',
                    backgroundColor: 'rgba(0, 0, 150, 0.8)',
                    fill: false
                }]
            },
            options: {
                scales: {
                    y: {
                        ticks: {
                            callback: function (value) {
                                // Custom tick formatting to reduce zeros
                                if (value >= 1000000) {
                                    return value / 1000000 + 'M'; // Convert to millions
                                } else if (value >= 1000) {
                                    return value / 1000 + 'K'; // Convert to thousands
                                } else {
                                    return value; // Show the value as is
                                }
                            }
                        },
                        beginAtZero: true,
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: false,
                            // text: 'حجم المبيعات' // Sales Volume
                        },

                    },
                    y1: {
                        beginAtZero: true,
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: false,
                            // text: 'نسبة النمو' // Growth Rate
                        },
                        grid: {
                            drawOnChartArea: false // Only want the grid lines for one axis to show up
                        }
                    }
                }
            }
        });


        // css change of growth rate
        $.each($('.growth'), function () {
            let vl = parseInt($(this).text())
            vl < 0 ? $(this).addClass('text-danger')
                : vl > 0 ? $(this).addClass('text-success')
                    : $(this).addClass('text-black')
            $(this).addClass('fw-bold');
        });
    },
    error: function (xhr, status, error) {
        var err = eval("(" + xhr.responseText + ")");
        console.log(error);
    }

});

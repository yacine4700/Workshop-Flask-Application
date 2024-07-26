function formatCurrency() {
    // format currancy
    $.each($(".currency"), function () {
        let amount = $(this).text();
        let cdt = amount.includes(',')
        if (!cdt) {
            let formatedAmount = new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "DZD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
                .format(parseInt(amount))
                .replace("DZD", "")
                .trim()
                .concat("د.ج"); // Adjust 'de-DE' and 'DZD' as needed
            $(this).text(formatedAmount);
        } else {
            return;
        }
    });
}

// change active class
const currentPath = window.location.pathname;

// Find the matching navigation link
$('.nav-link').each(function () {
    const linkHref = $(this).attr('href');
    if (linkHref && linkHref.endsWith(currentPath)) {
        $(this).addClass('active bg-primary');
        return false; // Exit the loop after finding a match
    }
});
// print and save invoice
$('#pdfGen').on('submit', function (e) {
    e.preventDefault()
    Swal.fire({
        title: 'الوصل',
        text: `هل أنت متأكد من جميع معلومات الوصل ؟`,
        icon: 'question',
        focusConfirm: false,
        showCloseButton: true,
        showConfirmButton: true,
        confirmButtonText: 'تأكيد',
        confirmButtonColor: '#dc3545',
        showCancelButton: true,
        cancelButtonText: 'إلغاء',
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.close()
            // Allow the SweetAlert overlay to be removed from the DOM
            setTimeout(() => {
                $(this).addClass('d-print-none');
                window.print();
                this.submit();
            }, 300); // Adjust the timeout as needed
        }
    })
});
// success function
function success(response) {
    Swal.fire({
        title: response.msg,
        icon: 'success',
        position: "bottom-start",
        showConfirmButton: false,
        timer: 1500
    }).then(() => setTimeout(() => window.location.reload(), 1500))
}
// total products
let totalProds = $('[id^="prod"]').length;
$('#total-prods').text(totalProds);
// total customers
let totalCusts = $('[id^="cust"]').length;
$('#total-custs').text(totalCusts);
// add a customer
let addCustomerMessageHtml = `
    <label for="" class="form-label">اسم الزبون</label>
    <input type="text" name="cust-name" id="cust-name" class="form-control" placeholder="Name" />
    <hr/>
    <label for="" class="form-label">رقم الهاتف</label>
    <input type="tel" name="cust-phone" id="cust-phone" class="form-control" placeholder="Phone Number" />
    <hr/>
    <label for="" class="form-label">العنوان</label>
    <input type="text" name="cust-address" id="cust-address" class="form-control" placeholder="العنوان">
`
$('#add-cust').on('click', function () {
    Swal.fire({
        title: "<strong>إضافة زبون</strong>",
        icon: "info",
        html: addCustomerMessageHtml,
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: `حفظ`,
        confirmButtonColor: '#7216cd',
        showCancelButton: false,
        preConfirm: (inputValue) => {
            // Input validation and formatting for phone number
            let custName = $('#cust-name').val();
            let phoneInput = $('#cust-phone').val().replace(/\D/g, '');
            let addressInput = $('#cust-address').val();
            if (!custName || !phoneInput || !addressInput || phoneInput.length !== 10) {
                Swal.showValidationMessage('يرجى ملأ جميع الحقول');
                return false; // Prevent form submission if invalid
            } else {
                return true; // Allow form submission if valid
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            let custName = $('#cust-name').val();
            let phoneInput = $('#cust-phone').val().replace(/\D/g, '');
            let addressInput = $('#cust-address').val();
            // prepare data to send
            let customerData = {
                custName: custName,
                custPhone: phoneInput,
                custAddress: addressInput
            }
            $.ajax({
                type: "post",
                url: "/postcustomer",
                data: "data",
                contentType: 'application/json',
                data: JSON.stringify(customerData),
                dataType: "json",
                success: function (response) {
                    success(response)
                },
            });
        }
    })
});
// modify customer
$('.modify-customer').on('click', function () {
    var customerId = $(this).data('customer-id');
    var customerName = $(this).data('name');
    var customerAddress = $(this).data('address');
    var customerPhone = $(this).data('phone');
    Swal.fire({
        title: 'تعديل معلومات زبون',
        html: `
        <label for="" class="form-label">اسم الزبون</label>
        <input type='text' id="custName" class="form-control" value="${customerName}">
        <hr/>
        <label for="" class="form-label">العنوان</label>
        <textarea id="customerAddress" class="form-control" cols="45">${customerAddress}</textarea>
        <hr/>
        <label for="" class="form-label">رقم الهاتف</label>
        <input type='text' id="customerPhone" class="form-control" value="${customerPhone}">
      `,
        focusConfirm: false,
        showCloseButton: true,
        preConfirm: () => {
            var newName = $('#custName').val();
            var newAdress = $('#customerAddress').val();
            var newPhone = $('#customerPhone').val();
            console.log('new name', newName)
            console.log('new adress', newAdress)
            console.log('new phone', newPhone)
            // compare new values with old
            if (newName !== customerName || newAdress !== customerAddress || newPhone !== customerPhone) {
                if (!newName || !newAdress || !newPhone) {
                    Swal.showValidationMessage('يرجى ملأ كل الحقول!');
                }
                // post changes
                return true
            } else {
                Swal.showValidationMessage('يرجى تعديل أحد الحقول على الأقل!');
                return false
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            var newName = $('#custName').val();
            var newAdress = $('#customerAddress').val();
            var newPhone = $('#customerPhone').val();
            let modifiedCustData = {
                custId: customerId,
                custName: newName,
                custAdr: newAdress,
                custPhone: newPhone
            }
            $.ajax({
                type: "post",
                url: "/updatecustomer",
                contentType: 'application/json',
                data: JSON.stringify(modifiedCustData),
                dataType: "json",
                success: function (response) {
                    success(response)
                }
            });
        }
    });
});
// remove customer
$('.delete-customer').on('click', function () {
    var customerId = $(this).data('customer-id');
    var customerName = $(this).data('name');
    Swal.fire({
        title: 'حذف زبون',
        html: `هل أنت متأكد من حذف منتج : <strong>${customerName}</strong> ؟`,
        icon: 'question',
        focusConfirm: false,
        showCloseButton: true,
        showConfirmButton: true,
        confirmButtonText: 'حذف',
        confirmButtonColor: '#dc3545',
        showCancelButton: true,
        cancelButtonText: 'إلغاء',
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                type: "post",
                url: "/deletecustomer",
                contentType: 'application/json',
                data: JSON.stringify(customerId),
                dataType: "json",
                success: function (response) {
                    success(response)
                }
            });
        }
    })
})
// customers finance
// get customers finance data
$.ajax({
    type: "GET",
    url: "/api/data",
    success: function (data) {
        let customers = data['customers'];
        $.each(customers, function (indexInArray, customer) {
            var newRow = `
                <tr>
                    <td >${indexInArray + 1}</td>
                    <td >${customer.name}</td>
                    <td class="currency">${(customer.amounts).toFixed(2)}</td>
                    <td class="currency">${(customer.paid).toFixed(2)}</td>
                    <td class="currency">${(customer.net).toFixed(2)}</td>
                    <td>${customer.last_pay ? customer.last_pay : '-'}</td>
                    <td><button type="button" 
                    class="btn border-0 vers-btn"
                    data-customer-id = "${customer.id}"
                    data-customer-name = "${customer.name}"
                    data-bs-target="#paying-dialog" 
                    data-bs-toggle="modal"
                    >
                    <i class="fas fa-plus text-success"></i>
                    </button>
                    </td>
                </tr>
            `;
            $("#cust-finance tbody").append(newRow);
            $('.vers-btn').on('click', function () {
                let custId = $(this).data('customer-id');
                let custName = $(this).data('customer-name');
                $('#customerId').val(custId);
                $('#customerName').val(custName);
            });

        });
    }
}).then(() => {
    let custTable = new DataTable('#cust-finance', {
        lengthMenu: [10, 25, 30, 35, 50], // Customize the available entries per page
        pageLength: 10, // Default number of entries to show per page
        // paging: false,
        language: {
            "sProcessing": "جارٍ التحميل...",
            "sLengthMenu": "عرض _MENU_",
            "sZeroRecords": "لم يتم العثور على أية بيانات",
            "sInfo": "عرض _START_ إلى _END_ من أصل _TOTAL_ زبون",
            "sInfoEmpty": "يعرض 0 إلى 0 من أصل 0 زبون",
            "sInfoFiltered": "(منتقاة من مجموع _MAX_ زبون)",
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
    })
});
// submit payement
$('#verssementSubmit').on('click', function () {
    let custId = $('#customerId').val();
    let verssement = $('#cust-verssement').val();
    let vDate = $('#dateVer').val();

    if (verssement && vDate) {
        let verData = {
            customerId: custId,
            verssement: verssement,
            verssementDate: (vDate).replace('/', '-')
        };
        $.ajax({
            type: "post",
            url: "/pay_verssement",
            contentType: 'application/json',
            data: JSON.stringify(verData),
            dataType: "json",
            success: function (response) {
                success(response);
            },
        });
    } else {

    }
});
// add a product
let addproductMessageHtml = `
    <label for="" class="form-label">الإسم التجاري</label>
    <input type="text" name="prod-name" id="prod-name" class="form-control" placeholder="الاسم (العمر) اللون" />
    <hr/>
    <label for="" class="form-label">السعر</label>
    <input type="number" name="prod-price" id="prod-price" class="form-control" />`
$('#add-prod').on('click', function () {
    Swal.fire({
        title: "<strong>إضافة منتج</strong>",
        icon: "info",
        html: addproductMessageHtml,
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: `حفظ`,
        confirmButtonColor: '#7216cd',
        showCancelButton: false,
        preConfirm: (inputValue) => {
            // Input validation and formatting for phone number
            let prodName = $('#prod-name').val();
            let prodPrice = $('#prod-price').val();
            if (!prodName || !prodPrice) {
                Swal.showValidationMessage('يرجى ملأ جميع الحقول');
                return false; // Prevent form submission if invalid
            } else {
                return true; // Allow form submission if valid
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            let prodName = $('#prod-name').val();
            let prodPrice = $('#prod-price').val();
            // prepare data to send
            let productData = {
                prodName: prodName,
                prodPrice: prodPrice
            }
            $.ajax({
                type: "post",
                url: "/postproduct",
                contentType: 'application/json',
                data: JSON.stringify(productData),
                dataType: "json",
                success: function (response) {
                    success(response)
                },
            });
        }
    })
});

// modify products
$('.modify-product').on('click', function () {
    var productId = $(this).data('prod-id');
    var productName = $(this).data('name');
    var productPrice = $(this).data('price');

    Swal.fire({
        title: 'تعديل المنتج',
        html: `
        <label for="" class="form-label">الإسم التجاري</label>
        <input type='text' id="productName" class="form-control" value="${productName}">
        <hr/>
        <label for="" class="form-label">السعر</label>
        <input type='number' id="productPrice" class="form-control" value="${productPrice}">
      `,
        focusConfirm: false,
        showCloseButton: true,
        preConfirm: () => {
            var newName = $('#productName').val();
            var newPrice = $('#productPrice').val();

            // compare new values with old
            if (newName !== productName || newPrice !== productPrice) {
                if (!newName || !newPrice) {
                    Swal.showValidationMessage('يرجى ملأ كل الحقول!');
                }
                // post changes
                return true
            } else {
                Swal.showValidationMessage('يرجى تعديل أحد الحقول على الأقل!');
                return false
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            var newName = $('#productName').val();
            var newPrice = $('#productPrice').val();
            let modifiedProdData = {
                prodId: productId,
                prodName: newName,
                prodPrice: newPrice
            }
            $.ajax({
                type: "post",
                url: "/updateproduct",
                contentType: 'application/json',
                data: JSON.stringify(modifiedProdData),
                dataType: "json",
                success: function (response) {
                    success(response)
                }
            });
        }
    });
});

// delete products
$('.delete-product').on('click', function () {
    var productId = $(this).data('prod-id');
    var productName = $(this).data('name');
    Swal.fire({
        title: 'حذف منتج',
        html: `هل أنت متأكد من حذف منتج : <strong>${productName}</strong> ؟`,
        icon: 'question',
        focusConfirm: false,
        showCloseButton: true,
        showConfirmButton: true,
        confirmButtonText: 'حذف',
        confirmButtonColor: '#dc3545',
        showCancelButton: true,
        cancelButtonText: 'إلغاء',
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                type: "post",
                url: "/deleteproduct",
                contentType: 'application/json',
                data: JSON.stringify(productId),
                dataType: "json",
                success: function (response) {
                    success(response)
                }
            });
        }
    })
})

// stock table
$.ajax({
    type: "GET",
    url: "/api/data",
    success: function (response) {
        var products = response["products"];
        var is_admin = response["is_admin"];
        $.each(products, function (index, product) {
            var newRow = `
                <tr>
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${(product.price).toFixed(2)}</td>
                    ${is_admin ? `<td>${product.sales}</td>` : ''}
                    <td class = "fs-bold stock">${product.stock}</td>
                    <td class = "">${product.last_change}</td>
                </tr>
            `;
            $("#stockTable tbody").append(newRow);
            var newOpt = `
                        <option value="${product.name}">${product.id}</option>
                        `;
            $("#productNames").append(newOpt);
            // css change of stock dependent on quantity
            $.each($('.stock'), function () {
                let vl = parseInt($(this).text())
                vl < 100 ? $(this).addClass('bg-danger')
                    : vl > 100 ? $(this).addClass('bg-success')
                        : $(this).addClass('')
            });
        });
    },
}).then(() => {
    let stockTable = new DataTable('#stockTable', {
        lengthMenu: [10, 25, 30, 35, 50], // Customize the available entries per page
        pageLength: 10, // Default number of entries to show per page
        // paging: false,
        language: {
            "sProcessing": "جارٍ التحميل...",
            "sLengthMenu": "عرض _MENU_",
            "sZeroRecords": "لم يتم العثور على أية بيانات",
            "sInfo": "عرض _START_ إلى _END_ من أصل _TOTAL_ منتج",
            "sInfoEmpty": "يعرض 0 إلى 0 من أصل 0 منتج",
            "sInfoFiltered": "(منتقاة من مجموع _MAX_ منتج)",
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
    });
    // sortSelectList("#productNames");
});
function searchCards(searchInput, cardContainer) {
    // Get the search term (case-insensitive)
    const searchTerm = $(searchInput).val().toLowerCase();

    // Find all cards within the container
    const cards = $(cardContainer).find('.card');

    // Loop through each card
    cards.each(function () {
        const cardTitle = $(this).find('.card-title .title-name').text().toLowerCase();

        // Check if card title contains the search term
        if (cardTitle.indexOf(searchTerm) !== -1) {
            $(this).closest('.col').show(); // Show matching cards
        } else {
            $(this).closest('.col').hide(); // Hide non-matching cards
        }
    });
}
// search items function
$.each($('.searchField'), function () {
    $(this).on('keyup', function () {
        searchCards(this, '.card-container');
    });
});

// login
$('#login').on('click', function () {
    Swal.fire({
        title: 'تسجيل الدخول',
        icon: 'info',
        html: `
        <label class='form-label'>كلمة المرور</label>
        <input type ="password" id="password" class="form-control">
        <div class="form-text">
            قم بإدخال كلمة المرور الخاصة بحسابك
        </div>
        `,
        confirmButtonText: 'تأكيد',
        showCloseButton: true,
        preConfirm: () => {
            var password = $('#password').val();
            if (!password) {
                Swal.showValidationMessage('يرجى إدخال كلمة سر!');
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            var password = $('#password').val();
            $.ajax({
                type: "post",
                url: "/login",
                data: JSON.stringify(password),
                dataType: "json",
                contentType: "application/json",
                success: function (response) {
                    setTimeout(() => {
                        window.location.reload()
                    }, 1500);
                },
                error: function (xhr, status, error) {
                    Swal.fire({
                        title: 'ERROR',
                        text: 'عليك إدخال كلمة مرور صحيحة',
                        icon: 'error'
                    })
                }
            });
        }
    })
});

// logout
$('#logout').on('click', function () {
    $.ajax({
        type: "post",
        url: "/logout",
        dataType: "json",
        contentType: "application/json",
        success: function (response) {
            setTimeout(() => {
                location.reload()
            }, 500);
        }
    });
});
// reset password
$('#settings').on("click", function () {
    Swal.fire({
        title: 'تعديل كلمة المرور',
        icon: '',
        html: `
        <label class='form-label'>كلمة المرور القديمة</label>
        <input type ="password" id="ancientPassword" class="form-control">
        
        <label class='form-label mt-2'>كلمة المرور الجديدة</label>
        <input type ="password" id="newPassword" class="form-control">
        
        <label class='form-label'>تأكيد كلمة المرور الجديدة</label>
        <input type ="password" id="confirmPassword" class="form-control">
        
        `,
        confirmButtonText: 'تأكيد',
        showCloseButton: true,
        preConfirm: () => {
            var ancientPassword = $('#ancientPassword').val();
            var confirmPassword = $('#confirmPassword').val();
            var newPassword = $('#newPassword').val();
            if (!confirmPassword || !newPassword || !ancientPassword) {
                Swal.showValidationMessage('يرجى ملأ جميع الحقول!');
            };
            if (confirmPassword !== newPassword) {
                Swal.showValidationMessage('يرجى التأكد من تطابق كلمة المرور!');
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            var ancientPassword = $('#ancientPassword').val();
            var newPassword = $('#newPassword').val();
            let userData = {
                password: ancientPassword,
                newPassword: newPassword
            }
            $.ajax({
                type: "post",
                url: "/reset_password",
                data: JSON.stringify(userData),
                dataType: "json",
                contentType: "application/json",
                success: function (response) {
                    setTimeout(() => {
                        window.location.reload()
                    }, 1500);
                },
                error: function (xhr, status, error) {
                    Swal.fire({
                        title: 'ERROR',
                        text: 'عليك إدخال كلمة المرور صحيحة',
                        icon: 'error'
                    })
                }
            });
        }
    })
});

// Show the spinner on page load
window.addEventListener('load', () => {

    setTimeout(() => {
        $("#page-loader").fadeOut(500, function () {
            $(this).remove()
        });
    }, 400); // Delay in milliseconds (adjust as needed)
});
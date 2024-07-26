// refresh the receipt
$('#refresh-btn').on('click', function () {
  location.reload()
})


// create a row if not exist
let numberOfTR = $('#receiptBody tr').length;
if (numberOfTR < 2) {
  addRow();
  $('#mbtn').prop('disabled', true)
  $('#sub').prop('disabled', true)
}
// set today date
let today = new Date();
let todayDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
$('#today-date').text(todayDate);
// adding row func
function addRow() {
  const rowCount = $('#receiptBody tr').length;
  let rowId = `product${rowCount}`
  const newRow = `
        <tr id="product${rowCount}" class = "fs-4">
          <td>${rowCount + 1}</td>
          <td>
            <input type="text" list="productOptions${rowCount}" id="" class="form-control fs-5 productSearch" placeholder="بحث عن منتج">
            <datalist id="productOptions${rowCount}" class="d-none form-select fs-5 productSelect">
            </datalist>
          </td>
          <td style="width: 20%;" ><input type="number" class="form-control fs-5 amount" value=""></td>
          <td style="width: 20%;"><input type="number" class="form-control fs-5 price" value=""></td>
          <td class="subtotal "></td>
          <td><button type="button" class="btn border-0 remove-btn">
          <i class="fas fa-trash-alt text-danger"></i>
        </button></td>
        </tr>
      `;
  $('#receiptBody').append(newRow);
  fetchData(rowId);
  $(`#${rowId} .subtotal`).text('0.00')
  // remove button
  $(`#${rowId} .remove-btn`).last().on('click', function () {
    $(this).closest('tr').remove();
    calculateTotal();
  });
  return $(`#${rowId} .productSearch`);
}

// fetch products and prices
function fetchData(trId) {
  $.ajax({
    url: '/api/data',
    type: 'GET',
    success: function (data) {
      let productsObj = data['products']
      const productList = $("#productList"); // Select element reference
      const productSearch = $(`#${trId} .productSearch`); // Input field reference

      // Populate the dropdown with product names
      $.each(productsObj, function (index, product) {
        $(`#${trId} .productSelect`).append('<option value="' + product['name'] + '">' + product['id'] + '</option>');
        // $(`#${trId} .productSelect`).append('<option value="' + product['id'] + '">' + product['name'] + '</option>');
      });
      // auto-fill prices
      $(`#${trId} .productSearch`).on('change', function () {
        var selectedId = $(this).val();
        // Fetch product details based on selected ID
        var selectedProduct = productsObj.find(function (product) {
          return product['name'] == selectedId;
        });
        if (selectedProduct) {
          var price = selectedProduct['price'];
          // Update the price input within the same table row
          $(`#${trId}`).find('.price').val(price);
          calculateTotal();
        } else {
          // Clear the price input if no product is selected
          $(`#${trId}`).find('.price').val('0.00');
        }
      });
      // Function to filter options based on search term
      function filterProducts(searchTerm) {
        productList.empty(); // Clear existing options
        productsObj.forEach(function (product) {
          const productName = product.name.toLowerCase(); // Convert product name to lowercase for case-insensitive search
          if (productName.includes(searchTerm.toLowerCase())) {
            const option = $("<option>").val(product.id).text(product.name);
            productList.append(option);
          }
        });
      };
      // Event listener for user input
      productSearch.on("keyup", function () {
        const searchTerm = $(this).val().toLowerCase();
        filterProducts(searchTerm);
      });
    },
  });
}




$('#mbtn').on('click', function () {
  let newInput = addRow(); // Call addRow and get the new input element
  $(this).prop('disabled', true);
  $('#sub').prop('disabled', true);
  newInput.focus(); // Set focus on the new input element

});

$('#receiptBody').on('input', 'input', function () {
  calculateTotal();
});

// calculation function
function calculateTotal() {
  let total = 0;
  let allFieldsFilled = true;

  $('#receiptBody tr').each(function () {
    let quantity = parseInt($(this).find('td:nth-child(3) input').val());
    let price = parseFloat($(this).find('td:nth-child(4) input').val());
    if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
      allFieldsFilled = false;
      $(this).find('td.subtotal').text('0.00')
    } else {
      let subtotal = quantity * price;
      total += subtotal;
      $(this).find('td.subtotal').text(subtotal.toFixed(2));
    }
  });
  let verssement = parseInt($('#verssement').val());
  if (verssement) {
    total -= verssement
  }
  $('#total').text(total.toFixed(2));
  // disable / enable print button
  $('#sub').prop('disabled', !allFieldsFilled)
  // Enable/disable plus button based on all fields filled
  $('#mbtn').prop('disabled', !allFieldsFilled);
};
// get data of customers
$.ajax({
  url: '/api/data',
  type: 'GET',
  success: function (data) {
    let customersObj = data['customers']
    let invoiceId = data['invoiceId']
    // Populate the dropdown with customer names
    $.each(customersObj, function (index, customer) {
      $('#customerSelect').append('<option value="' + customer['id'] + '">' + customer['name'] + '</option>');
    });

    // auto-fill of customer adress
    $('#customerSelect').on('change', function () {
      var selectedId = $(this).val();
      // Find the selected customer object
      var selectedCustomer = customersObj.find(function (customer) {
        return customer['id'] == selectedId;
      });
      if (selectedCustomer) {
        var address = selectedCustomer['address'];
        var phoneNumber = selectedCustomer['phone'];

        $('#address').text(address);
        $('#phoneNumber').text(phoneNumber);
      } else {
        $('#address').text('');
        $('#phoneNumber').text('');
      }
    });

    // change invoice id
    $('#invoice-num').text(invoiceId);
  }
}).then(() => sortSelectList('#customerSelect'));

// send data
$('#receiptForm').on('submit', function (e) {
  // check selected customer
  e.preventDefault() // prevent default submission
  let customer = $('#customerSelect').val();
  if (!customer) {
    Swal.fire({
      text: `اختر الزبون أولا!`,
      icon: "warning",
    }).then(() => $('#customerSelect').css('border-color', '#f00'))
  } else {
    // get the selected customer
    let selectedCustomer = $('#customerSelect').find('option[value="' + customer + '"]').text();
    let totalProducts = $('#receiptBody tr').length;
    let total = parseFloat($('#total').text().match(/\d+/g));
    let verssement = parseInt($('#verssement').val());
    let date = $('#today-date').text();
    let invoiceId = $('#invoice-num').text();
    let customerAddress = $('#address').text();
    let customerPhone = $('#phoneNumber').text();
    let tableData = [];
    let soldProducts = {}
    $('#receiptBody tr').each(function () {
      let item = $(this).find('td input.productSearch').val().trim();
      let qty = parseInt($(this).find('td input.amount').val().trim());
      let price = $(this).find('td input.price').val().trim();
      let subtotal = $(this).find('td.subtotal').text().trim();

      let itemData = {
        item: item,
        qty: qty,
        price: price,
        subtotal: subtotal
      };

      tableData.push(itemData);
      let itemId = $(this).find(`td datalist.productSelect option[value="${item}"]`).text();
      if (soldProducts[`${itemId}`]) {
        soldProducts[`${itemId}`] += qty
      } else { soldProducts[`${itemId}`] = qty }
    })


    // prepare data to send
    let invdata = {
      invoiceId: invoiceId,
      date: date,
      customerId: customer,
      customer: selectedCustomer,
      totalProducts: totalProducts,
      verssement: verssement ? verssement : 0,
      total: total,
      address: customerAddress,
      phone: customerPhone,
      tableData: tableData,
      productsQtys: soldProducts
    };
    $.ajax({
      type: "post",
      url: "/receiptsData",
      contentType: 'application/json',
      data: JSON.stringify(invdata),
      dataType: "json",
      success: function (response) {
        window.open(response.redirect_url, '_blank');
      },
    })
  }
});

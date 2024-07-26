// get invoices data
$.ajax({
    type: "GET",
    url: "/api/data",
    success: function (response) {
        invoices = response['invoices']
        $.each(invoices, function (index, invoice) {
            var newRow = `
            <tr>
                <td >${invoice.id}</td>
                <td>${invoice.date}</td>
                <td>${invoice.name}</td>
                <td>${invoice.products}</td>
                <td class="currency">${invoice.total}</td>
                <td ><button type="button" 
                class="btn border-0 edit-invoice" 
                data-bs-target="#modify-dialog" 
                data-bs-toggle="modal"
                data-invoice-id = "${invoice.id}" 
                >
                <i class="fas fa-pen text-success"></i>
                </button>
                <div class="d-inline mx-2">|</div>
                <button type="button" 
                class="btn border-0 open-invoice" 
                data-invoice-id = "${invoice.id}" 
                >
                <i class="fas fa-file-pdf text-danger"></i>
                </button>
                </td>
                
            </tr>
        `;
            $('#invoiceTable tbody').append(newRow);
        });
        formatCurrency();
        $('.edit-invoice').on('click', function () {
            let invoiceId = $(this).data('invoice-id');
            $('#invoiceId').val(invoiceId);
        });
        // open invoice
        $('.open-invoice').on('click', function () {
            var currentDate = new Date();
            var currentYear = currentDate.getFullYear();
            var currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is zero-based
            var invId = $(this).data('invoice-id')
            var pdfName = `invoice_${invId}.pdf`; // Replace with your PDF file name
            var pdfPath = `/docs/${currentYear}/${currentMonth}/${pdfName}`;
            window.open(pdfPath, '_blank');
        });
    }
}).then(() => {
    let table = new DataTable('#invoiceTable', {
        lengthMenu: [5, 10, 25, 30, 35, 50], // Customize the available entries per page
        pageLength: 5, // Default number of entries to show per page
        // paging: false,
        language: {
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
    });
});

// edit invoice
$('#edit-invoice').on("click", function () {
    let differance = $('#money').val();
    let invoiceId = $('#invoiceId').val();
    let checkedValue = $('input[name="flexRadioDefault"]:checked').attr('id');
    if (checkedValue === 'minus') {
        differance *= -1;
    }

    if (differance) {
        let invData = {
            invoiceId: invoiceId,
            differance: differance
        };
        $.ajax({
            type: "post",
            url: "/modify_invoice",
            contentType: 'application/json',
            data: JSON.stringify(invData),
            dataType: "json",
            success: function (response) {
                success(response);
            },
        });
    } else {
        $('#money').css('border-color', '#f00');
    }

});

  // close sale  and save/send data

class Order {
    constructor() {
        this._menu = [];
        this._previousSales = [];
        this._invoiceNumber = "";
        this._order = [];
        this._payment = {
            amountPaid: 0,
            type: "",
            change: 0
        };
    }

    get menu() {
        return this._menu;
    }

    set menu(menuArray) {
        this._menu = [];

        menuArray.forEach(menuItem => {
            let currItem = {};
            currItem.sku = menuItem[0];
            currItem.description = menuItem[1];
            currItem.price = menuItem[2];
            currItem.image = menuItem[3];
            this._menu.push(currItem);
        })
    }

    get previousSales() {
        return this._previousSales;
    }

    set previousSales(salesData) {
        this._previousSales = salesData;
    }

    get invoiceNumber() {
        return this._invoiceNumber;
    }

    set invoiceNumber(num) {
        this._invoiceNumber = num.toString();
    }

    get order() {
        return this._order;
    }

    set order(data) {
        this._order = data;
    }

    get payment() {
        return this._payment;
    }

    set payment(payment) {
        this._payment = payment;
    }

    generateInvoiceNumber() {
        if (this.previousSales.length < 1 || this.previousSales == undefined) {
            this.invoiceNumber = 1;
        } else {
            let skuArray = this.previousSales.map(sku => sku[1]);
            let highest = skuArray.reduce(function(a, b) {
                return Math.max(a, b);
            });
            this.invoiceNumber = highest + 1;
        }
    }

    addOrderLine(quantity, data) {
        let currentLine = {};
        let lineData = JSON.parse(data)

        currentLine.sku = lineData.sku;
        currentLine.description = lineData.description;
        currentLine.quantity = quantity;
        currentLine.price = Utilities.roundToTwo(parseFloat(lineData.price));
        currentLine.subtotal = currentLine.quantity * currentLine.price;

        this.order.push(currentLine);
        Ui.receiptDetails(this);
    }

    deleteOrderLine(index) {
        this.order.splice(index, 1);
        Ui.receiptDetails(this)
    }

    clearOrder() {
        this.order = [];

        Ui.receiptDetails(this);
    }
    getSummary() {
        const summary = {
            grandtotal: 0
        }

        this.order.forEach(orderLine => {
            summary.grandtotal += orderLine.subtotal;
        })


        return summary;
    }

    changePayment(input) {
        const orderGrandTotal = this.getSummary().grandtotal;
        if (input.amountPaid != null) this.payment.amountPaid = parseFloat(input.amountPaid);
        if (input.type != null) this.payment.type = input.type;
        if (this.payment.amountPaid >= orderGrandTotal) {
            this.payment.change = this.payment.amountPaid - orderGrandTotal;
            Ui.closeButton(false);
        } else {
            this.payment.change = 0;
            Ui.closeButton(true)
        }

        Ui.paymentSummary(this);
    }

    clearPayment() {
        this.payment = {
            amountPaid: 0,
            type: "",
            change: 0
        };

        Ui.paymentSummary(this);
    }

    exportOrder(date) {
      let exportData = [];

        this.order.forEach(orderLine => {
            let currentLine = [];
            currentLine[0] = date;
            currentLine[1] = this.invoiceNumber;
            currentLine[2] = orderLine.sku;
            currentLine[3] = orderLine.quantity;
            currentLine[4] = orderLine.price;

            exportData.push(currentLine);
            this.previousSales.push(currentLine);
        })

        return exportData;
    }

    exportPayment(date) {
        const currentPayment = [[]];

        currentPayment[0][0] = date;
        currentPayment[0][1] = this.invoiceNumber;
        currentPayment[0][2] = this.getSummary().grandtotal;
        return currentPayment;
    }

    closeSale() {
        const date = new Date();
        const orderData = this.exportOrder(date);
        const paymentData = this.exportPayment(date);
        const exportData = {
          order : orderData,
          payment: paymentData
        }

        Ui.hidePaypad(this);
        this.clearPayment();
        this.clearOrder();
        Ui.invoiceNumber(this);

        google.script.run.setData(JSON.stringify(exportData));
    }
}

class Ui {

    static menu(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.menu.forEach(item => {
            let menuElement = `<img src="${item.image}" alt="${item.description}" class="menu-img" style="width:150px;">
            <figcaption>${item.description}</figcaption>
            <figcaption>${Utilities.convertFloatToString(item.price)}</figcaption>`

            let node = document.createElement("figure");
            node.className = "menu-item";
            let dataString = JSON.stringify({ sku: `${item.sku}`, description: `${item.description}`, price: `${item.price}` })
            node.setAttribute("data-sku", dataString);
            node.innerHTML = menuElement;
            frag.appendChild(node);
        });

        document.getElementById('menu').appendChild(frag);

        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.addOrderLine(1, button.getAttribute("data-sku"));
            })
        })
    }

    static receiptDetails(orderInstance) {
        let frag = document.createDocumentFragment();

        orderInstance.order.forEach((orderLine, index) => {
            let receiptLine = `<td class="description">${orderLine.description}</td>
            <td class="price">${Utilities.convertFloatToString(orderLine.subtotal)}</td>
            <td class="delete" data-delete="${index.toString()}"><i class="fas fa-backspace"></i></td>`

            let node = document.createElement("tr");
            node.setAttribute("data-index", `${index.toString()}`);
            node.innerHTML = receiptLine;
            frag.appendChild(node);
        });

        let receiptDetails = document.getElementById("receipt-details");
        while (receiptDetails.hasChildNodes()) {
            receiptDetails.removeChild(receiptDetails.childNodes[0]);
        }

        receiptDetails.appendChild(frag);
        this.summary(orderInstance);

        document.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.deleteOrderLine(parseInt(button.getAttribute("data-delete")));
            })
        })
    }

    static invoiceNumber(orderInstance) {
        orderInstance.generateInvoiceNumber();
        const invoiceNumber = orderInstance.invoiceNumber;
        document.getElementById('invoice-number').textContent = `Invoice# ${invoiceNumber}`
    }
    static summary(orderInstance) {
        const summary = orderInstance.getSummary();
        const grandtotal = document.getElementById("grandtotal-summary");

        grandtotal.textContent = Utilities.convertFloatToString(summary.grandtotal);
    }

    static showPaypad(orderInstance) {
        if (orderInstance.getSummary().grandtotal > 0) {
           const paypad = document.getElementById('payment-overlay');
            paypad.style.display = "grid" 
        }
    }

    static hidePaypad(orderInstance) {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "none"
    }


    static paymentSummary(orderInstance) {
        document.getElementById('amount-paid').textContent = Utilities.convertFloatToString(orderInstance.payment.amountPaid);
        document.getElementById("change-value").textContent = Utilities.convertFloatToString(orderInstance.payment.change);
    }


    static closeButton(bool) {
        const closeButton = document.getElementById('close-sale');
        if (bool) {
            closeButton.style.display = "none";
        } else {
            closeButton.style.display = "block";
        }
    }
}

class Utilities {

    static convertFloatToString(float) {
        let priceParams = {
            style: "currency",
            currency: "USD"
        };

        return float.toLocaleString("en-us", priceParams);
    }

    static roundToTwo(num) {
        return +(Math.round(num + "e+2") + "e-2");
    }

    static paypad(input, orderInstance) {
        if (!isNaN(parseInt(input))) {
            this.numberPaypad(parseInt(input), orderInstance);
        } else if (input === "back") {
            this.backPaypad(orderInstance);
        } else if (input === "clear") {
            this.clearPaypad(orderInstance);
        } else {
            orderInstance.closeSale();
        }
    }

    static numberPaypad(input, orderInstance) {
        const currentInput = this.roundToTwo(input * .01);
        const currentAmountPaid = this.roundToTwo(orderInstance.payment.amountPaid);
        const newAmountPaid = this.roundToTwo((currentAmountPaid * 10) + currentInput);

        if (currentAmountPaid === 0) {
            orderInstance.changePayment({ amountPaid: currentInput });
        } else {
            orderInstance.changePayment({ amountPaid: newAmountPaid });
        }
    }

    static backPaypad(orderInstance) {
        const currentPayment = orderInstance.payment.amountPaid;

        if (currentPayment > 0) {
            const toSubtract = ((currentPayment * 100) % 10) * 0.01;
            const newAmount = (currentPayment - toSubtract) * 0.1;
            orderInstance.changePayment({ amountPaid: newAmount });
        }
    }

    static clearPaypad(orderInstance) {
        orderInstance.changePayment({ amountPaid: 0 });
    }
}






//-----------------------------------------------ORDER INSTANTIATION
const order = new Order();

function sheetData() {
  google.script.run.withSuccessHandler(function(dataArray){

    items = Object.values(dataArray.items);
    sales = dataArray.sales;

    order.menu = items;
    order.previousSales = sales;

    Ui.menu(order);
    Ui.invoiceNumber(order);
  }).getData();
}

//sheetData();


function sheetMockData() {

    items = mockMenuData;
    sales = mockPreviousSalesData;

    order.menu = items;
    order.previousSales = sales;

    Ui.menu(order);
    Ui.invoiceNumber(order);
}

//----------------------------------------------STATIC EVENT LISTENERS

document.getElementById('clear-order').addEventListener('click', () => {
    order.clearOrder();
})

document.querySelectorAll('.paypad-show').forEach(button => {
    button.addEventListener('click', () => {
        Ui.showPaypad(order);
        order.changePayment(JSON.parse(button.getAttribute("data-payment-type")));
    })
})

document.getElementById('paypad-close').addEventListener('click', () => {
    order.clearPayment();
    Ui.hidePaypad(order);
})

document.querySelectorAll('.paypad-btn').forEach(button => {
    button.addEventListener('click', () => {
        Utilities.paypad(button.getAttribute("data-id"), order);
    })
})



const mockMenuData = [
    [101, 'Burger', 10.99, 'https://i.imgur.com/Zk4qRCK.png'],
    [102, 'Fries', 6.99, 'https://i.imgur.com/vARmiFx.png'],
    [104, 'Pizza', 24.75, 'https://i.imgur.com/PNqblrH.png'],
    [105, 'Cake', 7.0, 'https://i.imgur.com/lNzJTNr.png'],
];

const mockPreviousSalesData = [
    ["", 4999, 101.0, 1.0, 10.99, 0.5495],
    ["", 4999, 102.0, 2.0, 7.95, 0.3975],
    ["", 4999, 103.0, 3.0, 8.96, 0.45],
    ["", 5000, 106.0, 1.0, 6.99, 0.35],
    ["", 5000, 107.0, 1.0, 5.95, 0.30]
];

const mockPaymentsData = [
    ["", 4999, 56.46, "cc", 5.00],
    ["", 5000, 13.59, "cash", 0]
]

sheetMockData()
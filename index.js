const express = require('express')
const cors = require('cors')
const escpos = require('escpos');

escpos.USB = require('escpos-usb');

const app = express();

app.use(cors());
app.use(express.json());


app.post('/invoicePrint', (req, res) => {
  const printerConfig = escpos.USB.findPrinter()
  const usbDevice = new escpos.USB(printerConfig[0].idVendor, printerConfig[0].idProduct);
  const options = { encoding: "GB18030" /* default */ }
  // encoding is optional
  
  const {invoiceNo, waiterName, dept, table, note , items, guest, date, time, discount, vat, remaining} = req.body;


  // calculation
  const itemsTotal = items.reduce((a,c) => a + c.price * c.quantity, 0);
  const totalVat = Number(vat || 0);
  const totalDiscount = Number(discount || 0);
  const netTotal = itemsTotal - totalDiscount;
  const totalAmount = ( itemsTotal + totalVat) - totalDiscount
  const remainingAmount = remaining ? 0 : itemsTotal + totalVat - totalDiscount;
  
  const printer = new escpos.Printer(usbDevice, options);

  function numberFix(n) {
    if(n.toString().length == 1) {
      return `${n}.00`
    } else if (n.toString().length === 2) {
      return `${n}.00`
    } else if(n.toString().length === 3) {
      return `${n}.00`
    } else if(n.toString().length === 4) {
      return `${n}.0`
    } 
    else {
      return n
    }
  }
  
  usbDevice.open(function(error){
    const accumulator = printer
    .font('a')
    .align('ct')
    .size(1, 1)
    .text('BON CAFE GULSHAN')
    .size(0,0)
    .text('The Royal Paradise, Road-74, House-5 Gulshan-2, Dhaka-1212')
    .text('Phone# 017545336602, 01933475503')
    .text('BIN: 003207203-0102')
    .text('Mushak-2.3')
    .drawLine()
    .align('lt')
    .size(1,0)
    .text(`${dept}: Table ${table}`)
    .text(`Waiter: ${waiterName || ''}`)
    .newLine()
    .align('ct')
    .size(1, 0)
    .text('Guest Bill')
    .newLine()
    .size(0,0)
    .align('lt')
    .tableCustom([
      { text: `Date: ${date}`, align: 'LEFT',  width: 0.50},
      { text: `Time: ${time}`, align: 'RIGHT', width: 0.50},
    ])
    .tableCustom([
      { text: `Invoice No: ${invoiceNo}`, align: 'LEFT',  width: 0.50},
      { text: `Number Of Guest: ${guest || ''}`, align: 'RIGHT', width: 0.50},
    ])
    .drawLine()
    .tableCustom([
      { text: 'Qty  Item Name', align: 'LEFT',  width: 0.50},
      { text: 'Price T.Price', align: 'RIGHT', width: 0.50},
    ])
    .drawLine()
    let acc = items.reduce((acc, item) => {
      return acc['tableCustom']([
        {
          text: `${item.quantity}`, align: 'LEFT',  width: 0.05
        },
        {
          text: `${item.name}`, align: 'LEFT',  width: 0.60
        },
        {
          text: `${numberFix(item.price)} ${numberFix(item.price * item.quantity)}`, align: 'RIGHT', width: 0.35
        }
      ])
    }, accumulator)
    
    acc = acc
    .drawLine()
    .font('b')
    .tableCustom([
      { text: 'Ticket Total:', align: 'LEFT',  width: 0.50},
      { text: `${numberFix(itemsTotal)}`, align: 'RIGHT', width: 0.50},
    ])
    .drawLine()

    acc = discount ? acc.tableCustom([
      { text: 'Total Discount:', align: 'LEFT',  width: 0.50},
      { text: `${numberFix(totalDiscount) || 0}`, align: 'RIGHT', width: 0.50},
    ]) : acc

    acc = acc.drawLine()
    .tableCustom([
      { text: 'Net Total', align: 'LEFT',  width: 0.50},
      { text: `${numberFix(netTotal)}`, align: 'RIGHT', width: 0.50},
    ])
    .drawLine()
    acc = vat ? acc.tableCustom([
      { text: 'Vat-10.00%:', align: 'LEFT',  width: 0.50},
      { text: `${numberFix(totalVat) || 0}`, align: 'RIGHT', width: 0.50},
    ]) : acc
    
    acc
    .drawLine()
    .tableCustom([
      { text: 'Gross Total:', align: 'LEFT',  width: 0.50},
      { text: `${numberFix(totalAmount)}`, align: 'RIGHT', width: 0.50},
    ])
    .size(0,3)
    .marginBottom(0)
    .drawLine()
    .size(0.70,1)
    .tableCustom([
      { text: 'REMAINING AMOUNT:', align: 'LEFT',  width: 0.60},
      { text: `${numberFix(remainingAmount)}`, align: 'RIGHT', width: 0.40},
    ])
    .size(0,3)
    .drawLine()
    .font('a')
    .size(0,0)
    .text(`Notes: ${note || ''}`)
    .text('THANK YOU, COME AGAIN')
    .text('Powered by: HawkEyes')
    .text('www.hedigital.tech')
    .align('ct')
    .qrimage('https://github.com/song940/node-escpos')
    
    .newLine()
    .cut()
    .close();
    res.json("Print successfully")
  });
})


app.post('/tokenPrint', (req, res) => {
  const printerConfig = escpos.USB.findPrinter()
  const usbDevice = new escpos.USB(printerConfig[0].idVendor, printerConfig[0].idProduct);
  const options = { encoding: "GB18030" /* default */ }
  // encoding is optional

  const {invoiceNo, orderType, waiterName, tokenNo, dept, table, note, orderSide, timestamp , items} = req.body;

  const listItems = items.map((item, i) => `${i + 1}-: ${item.name}  -X${item.quantity}`)
  
  const printer = new escpos.Printer(usbDevice, options);
  
  usbDevice.open(function(error){
    const accumulator = printer
    .align('CT')
    .feed()
    .size(1, 1)
    .text(orderSide)
    .size(0,0)
    .drawLine()
    .align('LT')
    .newLine()
    .size(0,0)
    .text(`Invoice No: ${invoiceNo}`)
    .spacing()
    .size(1,0)
    .font('a')
    .text(orderType)
    .newLine()
    .align('LT')
    .size(1,1)
    .font('b')

    const acc = listItems.reduce((acc, item) => {
      return acc['text'](item)
    }, accumulator)

      acc
      .size(0,3)
      .drawLine()
      .size(0,0)
      .font('a')
      .text(`Timestamp: ${timestamp}`)
      .spacing()
      .size(1,0)
      .text(`${dept}: Table ${table}`)
      .spacing()
      .size(0,0)
      .text(`Waiter: ${waiterName || ''}`)
      .size(1,1)
      .text(`Token No: ${tokenNo}`)
      .size(0,0)
      .text(`Notes: ${note}`)
      .newLine()
      .newLine()
      .cut()
      .close();
      res.json("Print successfully")
  });
})


app.post('/updateToken', (req, res) => {
  const printerConfig = escpos.USB.findPrinter()
  const usbDevice = new escpos.USB(printerConfig[0].idVendor, printerConfig[0].idProduct);
  const options = { encoding: "GB18030" /* default */ }
  // encoding is optional

  const {orderSide, invoiceNo, waiterName, tokenNo, dept, table, note, timestamp , cancelItems = [], increaseItems = [], decreaseItems = [], newItems = []} = req.body;

  const deleteItems = cancelItems?.map((item, i) => `${i + 1}-: ${item.name}  -X${item.quantity}`)
  const quantityDecrease = decreaseItems?.map((item, i) => `${i + 1}-: ${item.name}  -X${item.quantity}`)
  const quantityIncrease = increaseItems?.map((item, i) => `${i + 1}-: ${item.name}  -X${item.quantity}`)
  const addNewItems = newItems?.map((item, i) => `${i + 1}-: ${item.name}  -X${item.quantity}`)
  
  const printer = new escpos.Printer(usbDevice, options);
  
  usbDevice.open(function(error){
    let accumulator = printer
    .align('CT')
    .feed()
    .size(1, 1)
    .text(`Update ${orderSide} Items`)
    .size(0,0)
    .drawLine()
    .align('LT')
    .newLine()
    .newLine()
    .newLine()
    .size(0,0)
    .text(`Invoice No: ${invoiceNo}`)
    .spacing()
    .size(1,0)
    .font('a')
    .text('Previous Order Update')
    .newLine()
    .align('LT')
    .size(1,1)
    .font('b')

    accumulator = cancelItems.length ? accumulator.font('a') : accumulator
    accumulator = cancelItems.length ?  accumulator.text('Cancel Items') : accumulator

    accumulator = cancelItems.length ? accumulator.font('b') : accumulator
    accumulator = cancelItems.length ? deleteItems.reduce((acc, item) => {
      return acc['text'](item)
    }, accumulator) : accumulator
    
    accumulator = cancelItems.length ? accumulator.size(0,0) : accumulator
    accumulator = cancelItems.length ? accumulator.drawLine() : accumulator

    
    accumulator = increaseItems.length ? accumulator.size(1,1) : accumulator
    accumulator = increaseItems.length ? accumulator.font('a') : accumulator
    accumulator = increaseItems.length ?  accumulator.text('Increase Quantity') : accumulator
    accumulator = increaseItems.length ? accumulator.font('b') : accumulator
    accumulator = increaseItems.length ? quantityIncrease.reduce((acc, item) => {
      return acc['text'](item)
    }, accumulator) : accumulator
    
    accumulator = increaseItems.length ? accumulator.size(0,0) : accumulator
    accumulator = increaseItems.length ? accumulator.drawLine() : accumulator

    
    
    accumulator = decreaseItems.length ?  accumulator.font('a') : accumulator
    accumulator = decreaseItems.length ?  accumulator.size(1,1) : accumulator
    accumulator = decreaseItems.length ?  accumulator.text('Decrease Quantity') : accumulator
    accumulator = decreaseItems.length ?  accumulator.font('b') : accumulator
    accumulator = decreaseItems.length ? quantityDecrease.reduce((acc, item) => {
      return acc['text'](item)
    }, accumulator) : accumulator
    
    accumulator = decreaseItems.length ? accumulator.size(0,0) : accumulator
    accumulator = decreaseItems.length ? accumulator.drawLine() : accumulator

    
    
    accumulator = newItems.length ?  accumulator.size(1,1) : accumulator
    accumulator = newItems.length ?  accumulator.font('a') : accumulator
    accumulator = newItems.length ?  accumulator.text('Add New Items') : accumulator
    accumulator = newItems.length ?  accumulator.font('b') : accumulator
    
    accumulator = newItems.length ? addNewItems.reduce((acc, item) => {
      return acc['text'](item)
    }, accumulator) : accumulator

    accumulator
    .size(0,3)
    .drawLine()
    .size(0,0)
    .font('a')
    .text(`Timestamp: ${timestamp}`)
    .spacing()
    .size(1,0)
    .text(`${dept}: Table ${table}`)
    .spacing()
    .size(0,0)
    .text(`Waiter: ${waiterName || ''}`)
    .size(1,1)
    .text(`Token No: ${tokenNo}`)
    .size(0,0)
    .text(`Notes: ${note}`)
    .newLine()
    .newLine()
      .cut()
      .close();
      res.json("Print successfully")
  });
})

app.listen(5000, () => {
  console.log(`Listening on port ${5000}`)
})
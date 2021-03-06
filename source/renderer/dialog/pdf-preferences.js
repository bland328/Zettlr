/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PDFPreferences class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This dialog lets you customise the PDF preferences for the
 *                  whole app.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')
const validate = require('../../common/validate.js')
const SUPPORTED_PAPERTYPES = require('../../common/data.json').papertypes
const PAPERNAMES = require('../../common/data.json').papernames

class PDFPreferences extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'pdf-preferences'
  }

  preInit (data) {
    data.pdf.lineheight = data.pdf.lineheight * 100
    data.supportedPapertypes = SUPPORTED_PAPERTYPES
    data.papertypeNames = PAPERNAMES
    data.availableMarginUnits = ['cm', 'mm', 'pt']
    data.availablePageNumberingSystems = ['arabic', 'alph', 'Alph', 'roman', 'Roman', 'gobble']
    return data
  }

  postAct () {
    // Activate the form to be submitted
    let form = this._modal.find('form#dialog')
    form.on('submit', (e) => {
      e.preventDefault()
      // Give the ZettlrBody object the results
      // Form: dialog type, values, the originally passed object
      this.proceed(form.serializeArray())
    })
  }

  proceed (data) {
    let cfg = {}
    // PDF preferences
    cfg['pdf.titlepage'] = (data.find(elem => elem.name === 'pdf.titlepage') !== undefined)
    cfg['pdf.toc'] = (data.find(elem => elem.name === 'pdf.toc') !== undefined)

    // Copy over all other field values from the result set.
    for (let r of data) {
      // Only non-missing to not overwrite the checkboxes that ARE checked with a "yes"
      if (!cfg.hasOwnProperty(r.name)) {
        // Convert numbers to prevent validation errors.
        if (!isNaN(r.value) && r.value !== '') r.value = Number(r.value)
        cfg[r.name] = r.value
      }
    }

    // Adapt the line height to the settings format.
    cfg['pdf.lineheight'] = cfg['pdf.lineheight'] / 100

    // Validate dat shit.
    let unvalidated = validate(cfg)

    if (unvalidated.length > 0) {
      // For brevity reasons only show one at a time (they have to be resolved either way)
      this.getModal().find('.error-info').text(unvalidated[0].reason)
      for (let prop of unvalidated) {
        // Indicate which ones were wrong.
        this.getModal().find(`input[name="${prop.key}"]`).first().addClass('has-error')
      }
      return // Don't try to update falsy settings.
    }

    // Send and close
    global.ipc.send('update-config', cfg)
    this.close()
  }
}

module.exports = PDFPreferences

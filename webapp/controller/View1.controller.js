sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, Fragment) {
    "use strict";

    return Controller.extend("alcami.controller.View1", {
        onInit: function () {
            const oModel = new JSONModel();
            oModel.loadData("/model/data.json", null, false);
            this.getView().setModel(oModel);

            const oView = this.getView();
            const oToday = new Date();

            this._setMinDate(oView.byId("arrivalDateInput"), oToday);
            this._setMinDate(oView.byId("dateToPlaceConditionsInput"), oToday);

            const oSampleModel = new JSONModel({
                "AttachmentSet": [],
            });
            this.getView().setModel(oSampleModel, "SampleModel");

            if (!this.getView().getModel("InputItemsModel")) {
                const oInputItemsModel = new JSONModel({
                    "ItemDetailsSet": []
                });
                this.getView().setModel(oInputItemsModel, "InputItemsModel");
            }

            oView.byId("customer").setValue("C001");
        },

        _setMinDate: function (oDatePicker, oDate) {
            if (oDatePicker) {
                oDatePicker.setMinDate(oDate);
            }
        },

        _handleDateChange: function (oEvent) {
            const oDatePicker = oEvent.getSource();
            const oSelectedDate = oDatePicker.getDateValue();
            if (oSelectedDate && (oSelectedDate.getDay() === 0 || oSelectedDate.getDay() === 6)) {
                MessageToast.show("Please select a date that is not a Saturday or Sunday.");
                oDatePicker.setDateValue(null);
            }
        },

        onArrivalDateChange: function (oEvent) {
            this._handleDateChange(oEvent);
        },

        onDateToPlaceConditionsChange: function (oEvent) {
            this._handleDateChange(oEvent);
        },

        onCarrierChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oView = this.getView();
            this._toggleVisibility(sSelectedKey === "alcami", [
                oView.byId("shippingMaterialProviderInput"),
                oView.byId("dimensionsInput"),
                oView.byId("TemperatureDeviceProvider")
            ]);
        },

        _toggleVisibility: function (bVisible, aControls) {
            aControls.forEach(function (oControl) {
                if (oControl && oControl.getParent()) {
                    oControl.getParent().setVisible(bVisible);
                }
            });
        },

        onTemperatureDeviceProviderChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oTDQ = this.getView().byId("TDQ");
            if (sSelectedKey === "NoneRequired" && oTDQ) {
                oTDQ.setSelectedKey("None");
            }
        },

        onStabilityChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oVBox = this.getView().byId("dateToPlaceConditionsVBox");
            if (oVBox) {
                oVBox.setVisible(sSelectedKey !== "no");
            }
        },

        onUploadDocuments: function (oEvent) {
            const aFiles = oEvent.getParameter("files");
            const oModel = this.getView().getModel("SampleModel");
            if (!oModel) {
                MessageToast.show("SampleModel is not set.");
                return;
            }
            let aAttachments = oModel.getProperty("/AttachmentSet") || [];
            let filesProcessed = 0;

            aFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    aAttachments.push({
                        Filename: file.name,
                        Mimetype: file.type,
                        Content: e.target.result,
                        Documentsize: file.size
                    });
                    filesProcessed++;

                    if (filesProcessed === aFiles.length) {
                        oModel.setProperty("/AttachmentSet", aAttachments);
                        MessageToast.show("Attachments Added");
                    }
                };
                reader.readAsDataURL(file);
            });
        },

        onDeleteSelected: function () {
            const oTable = this.getView().byId("fileTable1");
            if (!oTable) {
                MessageToast.show("File table not found.");
                return;
            }
            const aSelectedItems = oTable.getSelectedItems();
            if (aSelectedItems.length > 0) {
                const oModel = this.getView().getModel("SampleModel");
                if (!oModel) {
                    MessageToast.show("SampleModel is not set.");
                    return;
                }
                let aAttachments = oModel.getProperty("/AttachmentSet") || [];

                aSelectedItems.forEach(oItem => {
                    const oContext = oItem.getBindingContext("SampleModel");
                    if (oContext) {
                        const oFile = oContext.getObject();
                        if (oFile && oFile.Filename) {
                            aAttachments = aAttachments.filter(file => file.Filename !== oFile.Filename);
                        }
                    } else {
                        console.error("Binding context is undefined for selected item.");
                    }
                });

                oModel.setProperty("/AttachmentSet", aAttachments);
                this.byId("deleteButton").setEnabled(false);
                MessageToast.show("Selected files deleted.");
            }
        },

        onSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedItems = oTable.getSelectedItems();
            this.byId("deleteButton").setEnabled(aSelectedItems.length > 0);
        },

        onOpenValueHelp: function () {
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = sap.ui.xmlfragment("alcami.view.fragment.ProjectSelection", this);
                this.getView().addDependent(this._oValueHelpDialog);
            }
            const sCustomerInputValue = this.getView().byId("customer").getValue();
            const oBinding = this._oValueHelpDialog.getBinding("items");
            if (sCustomerInputValue) {
                const oFilter = new Filter("CustomerID", FilterOperator.EQ, sCustomerInputValue);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
            this._oValueHelpDialog.open();
        },

        onProjectSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("value");
            const aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter("ProjectName", FilterOperator.Contains, sQuery));
            }
            const oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(aFilters);
        },

        onProjectVHClose: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sProjectName = oSelectedItem.getTitle();
                this.getView().byId("projectInput").setValue(sProjectName);
                MessageToast.show("Selected Project: " + sProjectName);
            }
        },

        onAddItem: function () {
            if (!this._oInboundItemDialog) {
                this._oInboundItemDialog = sap.ui.xmlfragment("alcami.view.fragment.InboundItem", this);
                this.getView().addDependent(this._oInboundItemDialog);
            }
            this._oInboundItemDialog.open();
        },

        onInboundItemAdd: function () {
            var oDialog = this.getView().byId("inboundItemDialog");
            if (!oDialog) {
                MessageToast.show("Dialog not found");
                return;
            }

            var oInput = oDialog.byId("customerMaterialInput");
            if (!oInput) {
                MessageToast.show("Input control not found");
                return;
            }

            var sCustomerMaterialNumber = oInput.getValue();

            if (!sCustomerMaterialNumber) {
                MessageToast.show("Please enter Customer Material Number");
                return;
            }

            var oModel = this.getView().getModel("SampleModel");
            var aItems = oModel.getProperty("/ItemDetailsSet") || [];

            var oNewItem = {
                CustomerMaterialNumber: sCustomerMaterialNumber,
                MaterialDescription: "",
                UOM: "",
                OrderQuantity: 0,
                StorageConditions: "",
                Notes: ""
            };

            aItems.push(oNewItem);

            oModel.setProperty("/ItemDetailsSet", aItems);

            MessageToast.show("Item added successfully!");

            oDialog.close();
        },

        onInboundItemCancel: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
        },

        onCustomerMaterialValueHelp: function () {
            if (!this._customerMaterialDialog) {
                Fragment.load({
                    name: "alcami.view.fragment.CustomerMaterialValueHelp",
                    controller: this
                }).then(oDialog => {
                    this._customerMaterialDialog = oDialog;
                    this.getView().addDependent(this._customerMaterialDialog);
                    this._customerMaterialDialog.open();
                });
            } else {
                this._customerMaterialDialog.open();
            }
        },

        onCustomerMaterialSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const aFilters = [];
            if (sValue) {
                aFilters.push(
                    new Filter({
                        filters: [
                            new Filter("customerMaterialNumber", FilterOperator.Contains, sValue),
                            new Filter("materialDescription", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })
                );
            }

            const oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onCustomerMaterialVHClose: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems");
            if (aSelectedItems && aSelectedItems.length > 0) {
                const aSelectedMaterialNumbers = aSelectedItems.map(oItem => oItem.getTitle());

                MessageToast.show("Selected: " + aSelectedMaterialNumbers.join(", "));

                const oInput = sap.ui.getCore().byId("customerMaterialInput");
                if (oInput) {
                    oInput.setValue(aSelectedMaterialNumbers.join(", "));
                } else {
                    console.error("customerMaterialInput not found.");
                }
            }
        }
    });
});

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, Fragment) {
    "use strict";

    return Controller.extend("alcami.controller.View1", {

        // 0. INIT
        onInit: function () {
            const oModel = new JSONModel();
            oModel.loadData("/model/data.json", null, false);
            this.getView().setModel(oModel);

            var oModel1 = new JSONModel({
                InboundItemset: []
            });
            this.getView().setModel(oModel1, "InputItemsModel");

            const oToday = new Date();
            this._setMinDate(this.getView().byId("arrivalDateInput"), oToday);
            this._setMinDate(this.getView().byId("dateToPlaceConditionsInput"), oToday);

            const oSampleModel = new JSONModel({
                "AttachmentSet": []
            });
            this.getView().setModel(oSampleModel, "SampleModel");

            if (!this.getView().getModel("InputItemsModel")) {
                const oInputItemsModel = new JSONModel({
                    "ItemDetailsSet": []
                });
                this.getView().setModel(oInputItemsModel, "InputItemsModel");
            }

            this.getView().byId("customer").setValue("C001");
        },

        // 1. onOpenValueHelp: Project value help
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

        // 2. onCarrierChange: Carrier ComboBox change
        onCarrierChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oView = this.getView();
            this._toggleVisibility(sSelectedKey === "alcami", [
                oView.byId("shippingMaterialProviderInput"),
                oView.byId("dimensionsInput"),
                oView.byId("TemperatureDeviceProvider")
            ]);
        },

        // 3. onArrivalDateChange: Arrival Date DatePicker change
        onArrivalDateChange: function (oEvent) {
            this._handleDateChange(oEvent);
        },

        // 4. onStabilityChange: Stability ComboBox change
        onStabilityChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oVBox = this.getView().byId("dateToPlaceConditionsVBox");
            if (oVBox) {
                oVBox.setVisible(sSelectedKey !== "no");
            }
        },

        // 5. onTemperatureDeviceProviderChange: Temperature Device Provider ComboBox change
        onTemperatureDeviceProviderChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oTDQ = this.getView().byId("TDQ");
            if (sSelectedKey === "NoneRequired" && oTDQ) {
                oTDQ.setSelectedKey("None");
            }
        },

        // 6. onUploadDocuments: FileUploader for attachments
        onUploadDocuments: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            var oModel = this.getView().getModel("SampleModel");
            var aAttachments = oModel.getProperty("/AttachmentSet") || [];
            // console.log("aFiles", aFiles);
            // console.log("lenght", aFiles.length);
            for (var i = 0; i < aFiles.length; i++) {
                var file = aFiles[i];
                var reader = new FileReader();
 
                reader.onload = (function (file) {
                    return function (e) {
                        aAttachments.push({
                            Filename: file.name,
                            Mimetype: file.type,
                            Content: e.target.result,
                            Documentsize: file.size,
 
                        });
                        oModel.setProperty("/AttachmentSet", aAttachments);
                    };
                })(file);
 
                reader.readAsDataURL(file); // Read file as Base64
            }
            // this.getView().byId("attachment").setValue("");
            MessageToast.show("Attachment Added");
            this.onUploadCompleted();
        },

        // 7. onSelectionChange: Attachments table selection change
        onSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedItems = oTable.getSelectedItems();
            this.byId("deleteButton").setEnabled(aSelectedItems.length > 0);
        },

        // 8. onDeleteSelected: Delete selected files from attachments table
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
            } else {
                MessageToast.show("No files selected for deletion.");
            }
        },

        // 9. onAddPress: Add button for inventory items (opens inbound item fragment)
        onAddPress: function () {
            if (!this._oInboundItemDialog) {
                this._oInboundItemDialog = sap.ui.xmlfragment("alcami.view.fragment.InboundItem", this);
                this.getView().addDependent(this._oInboundItemDialog);
            }
            this._oInboundItemDialog.open();
        },

        // 10. onDeleteSelectedItems: Delete selected inventory items
        onDeleteSelectedItems: function () {
            var oTable = this.byId("OIMTable");
            var oModel = this.getView().getModel("InputItemsModel");
            var aItems = oModel.getProperty("/InboundItemset");
            var aSelectedIndices = oTable.getSelectedIndices();

            // Remove selected items
            aSelectedIndices.sort((a, b) => b - a).forEach(function (iIndex) {
                aItems.splice(iIndex, 1);
            });

            oModel.setProperty("/InboundItemset", aItems);
            oTable.removeSelections();
        },

        // 11. onSelectedLineInventoryItems: Inventory items table selection
        onSelectedLineInventoryItems: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext("InputItemsModel");
            var oData = oContext.getObject();
            MessageToast.show("Selected: " + oData.Customermaterial);
        },

        // --- Additional/Fragment-related Functions ---

        onDateToPlaceConditionsChange: function (oEvent) {
            this._handleDateChange(oEvent);
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
                this._oInboundItemDialog = sap.ui.xmlfragment("alcami.view.fragment.inboundItem", this);
                this.getView().addDependent(this._oInboundItemDialog);
            }
            this._oInboundItemDialog.open();
        },

        InboundonAddPress: function () {
            var oModel = this.getView().getModel("InputItemsModel");
            var aItems = oModel.getProperty("/InboundItemset");
            // Create a new item with default values
            var oNewItem = {
                Customermaterial: "", // You can set a default value if needed
                Materialdescription: "", // You can set a default value if needed
                Uom: "", // You can set a default value if needed
                OrderQuantity: 0, // Default to 0 instead of an empty string
                StorageConditions: "", // You can set a default value if needed
                Notes: "" // You can set a default value if needed
            };
            // Push the new item to the array
            aItems.push(oNewItem);
            // Update the model
            oModel.setProperty("/InboundItemset", aItems);
            
            // Optionally, you can open the dialog for the user to fill in the details
            if (!this._oInboundItemDialog) {
                this._oInboundItemDialog = sap.ui.xmlfragment("alcami.view.fragment.InboundItem", this);
                this.getView().addDependent(this._oInboundItemDialog);
    }
    this._oInboundItemDialog.open();
},

        // onInboundItemAdd: function () {
        //     const oDialog = this.getView().byId("inboundItemDialog");
        //     if (!oDialog) {
        //         MessageToast.show("Dialog not found");
        //         return;
        //     }

        //     const oInput = oDialog.byId("customerMaterialInput");
        //     if (!oInput) {
        //         MessageToast.show("Input control not found");
        //         return;
        //     }

        //     const sCustomerMaterialNumber = oInput.getValue();

        //     if (!sCustomerMaterialNumber) {
        //         MessageToast.show("Please enter Customer Material Number");
        //         return;
        //     }

        //     const oModel = this.getView().getModel("InputItemsModel");
        //     const aItems = oModel.getProperty("/ItemDetailsSet") || [];

        //     const oNewItem = {
        //         Customermaterial: sCustomerMaterialNumber,
        //         Materialdescription: "",
        //         Uom: "",
        //         OrderQuantity: 0,
        //         StorageConditions: "",
        //         Notes: ""
        //     };

        //     aItems.push(oNewItem);
        //     oModel.setProperty("/ItemDetailsSet", aItems);

        //     MessageToast.show("Item added successfully!");
        //     oDialog.close();
        // },

        onInboundItemCancel: function () {
            if (this._oInboundItemDialog) {
                this._oInboundItemDialog.close();
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

        onStorageConditionsVH: function (oEvent) {
            MessageToast.show("Value help requested for Storage Conditions");
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
        },

        // --- Private/Helper Functions ---
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

        _toggleVisibility: function (bVisible, aControls) {
            aControls.forEach(function (oControl) {
                if (oControl && oControl.getParent()) {
                    oControl.getParent().setVisible(bVisible);
                }
            });
        }
    });
});

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
            const oTable = this.byId("fileTable1");
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
            var aSelectedItems = oTable.getSelectedItems();
        
            if (!oTable || !oModel) {
                MessageToast.show("Table or model not found.");
                return;
            }
        
            if (aSelectedItems.length === 0) {
                MessageToast.show("No items selected for deletion.");
                return;
            }
        
            // Filter out selected items from data model
            var aFilteredItems = aItems.filter(function (item) {
                // Check if this item is selected by comparing with selected items context path
                return !aSelectedItems.some(function (oSelectedItem) {
                    var oContext = oSelectedItem.getBindingContext("InputItemsModel");
                    return oContext && oContext.getPath() === oModel.getContext("/").getPath() + item.Path; // Not ideal, see below
                });
            });
        
            // Since items array doesn't have 'Path' property, we need to identify selected items using binding context objects
        
            // A better approach is:
            // Remove each selected item's binding context object from aItems
            aSelectedItems.forEach(function (oSelectedItem) {
                var sPath = oSelectedItem.getBindingContext("InputItemsModel").getPath();
                // sPath looks like "/InboundItemset/0", extract index:
                var iIndex = parseInt(sPath.substring(sPath.lastIndexOf('/') + 1));
                if (!isNaN(iIndex)) {
                    aItems.splice(iIndex, 1);
                }
            });
        
            oModel.setProperty("/InboundItemset", aItems);
            oTable.removeSelections();
        
            MessageToast.show("Selected items deleted successfully.");
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

        

        InboundonAddPress: function () {
            const oModel = this.getView().getModel("InputItemsModel");
            const aItems = oModel.getProperty("/InboundItemset");

            const sCustomerMaterialNumber = sap.ui.getCore().byId("customerMaterialInput").getValue();
        
            // const sCustomerMaterialNumber = this._oInboundItemDialog.byId("customerMaterialInput").getValue();
            if (!sCustomerMaterialNumber) {
                MessageToast.show("Please enter or select a Customer Material Number.");
                return;
            }
        
            // Get main model that has data.json loaded
            const oMainModel = this.getView().getModel();
            const aCustomerMaterials = oMainModel.getProperty("/customerMaterial") || [];
        
            // Find matching material details for the entered customerMaterialNumber
            const oMaterial = aCustomerMaterials.find(function(item) {
                return item.customerMaterialNumber === sCustomerMaterialNumber;
            });
        
            if (!oMaterial) {
                MessageToast.show("Customer Material Number not found in data.");
                return;
            }
        
            // Create new item with details from lookup and default values for others
            const oNewItem = {
                Customermaterial: sCustomerMaterialNumber,
                Materialdescription: oMaterial.materialDescription,
                Uom: oMaterial.uom,
                OrderQuantity: 0,
                StorageConditions: "",
                Notes: ""
            };
        
            aItems.push(oNewItem);
            oModel.setProperty("/InboundItemset", aItems);
        
            this._oInboundItemDialog.close();
            MessageToast.show("Item added successfully.");
        },
        

        onInboundItemCancel: function () {
            if (this._oInboundItemDialog) {
                this._oInboundItemDialog.close();
            }
        },

        onCustomerMaterialValueHelp: function () {
            if (!this._customerMaterialDialog) {
                this._customerMaterialDialog = sap.ui.xmlfragment("alcami.view.fragment.CustomerMaterialValueHelp", this);
                this.getView().addDependent(this._customerMaterialDialog);
            }
            this._customerMaterialDialog.open();
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

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

        // 0. INIT: Initialize the controller and set up models and default values
        onInit: function () {
            const oModel = new JSONModel();
            oModel.loadData("/model/data.json", null, false);
            this.getView().setModel(oModel);

            var oModel1 = new JSONModel({
                InboundItemset: []
            });
            this.getView().setModel(oModel1, "InputItemsModel");

            // validate the each wizard

            const oToday = new Date();
            this._setMinDate(this.getView().byId("arrivalDateInput"), oToday);
            this._setMinDate(this.getView().byId("dateToPlaceConditionsInput"), oToday);

            const oSampleModel = new JSONModel({
                "AttachmentSet": []
            });
            this.getView().setModel(oSampleModel, "SampleModel");

            this.getView().byId("customer").setValue("C001"); // Set default customer value
        },

        // 1. onOpenValueHelp: Opens the project value help dialog and applies filters based on customer input
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
                oBinding.filter([]); // Clear filters if no customer input
            }
            this._oValueHelpDialog.open(); // Open the dialog
        },

        // 2. onCarrierChange: Handles changes in the Carrier ComboBox and toggles visibility of related fields
        onCarrierChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oView = this.getView();
            this._toggleVisibility(sSelectedKey === "alcami", [
                oView.byId("shippingMaterialProviderInput"),
                oView.byId("dimensionsInput"),
                oView.byId("TemperatureDeviceProvider")
            ]);
        },

        // 3. onArrivalDateChange: Handles changes in the Arrival Date DatePicker
        onArrivalDateChange: function (oEvent) {
            this._handleDateChange(oEvent); // Call helper function to handle date validation
        },

        // 4. onStabilityChange: Handles changes in the Stability ComboBox and toggles visibility of related fields
        onStabilityChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oVBox = this.getView().byId("dateToPlaceConditionsVBox");
            if (oVBox) {
                oVBox.setVisible(sSelectedKey !== "no"); // Show or hide based on selection
            }
        },

        // 5. onTemperatureDeviceProviderChange: Handles changes in the Temperature Device Provider ComboBox
        onTemperatureDeviceProviderChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oTDQ = this.getView().byId("TDQ");
            if (sSelectedKey === "NoneRequired" && oTDQ) {
                oTDQ.setSelectedKey("None"); // Set default value if "NoneRequired" is selected
            }
        },

        // 6. onUploadDocuments: Handles file uploads for attachments
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
                        oModel.setProperty("/AttachmentSet", aAttachments); // Update model with new attachments
                    };
                })(file);

                reader.readAsDataURL(file); // Read file as Base64
            }
            MessageToast.show("Attachment Added"); // Notify user
            this.onUploadCompleted(); // Call any additional completion logic
        },

        // 7. onSelectionChange: Handles selection changes in the attachments table
        onSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedItems = oTable.getSelectedItems();
            this.byId("deleteButton").setEnabled(aSelectedItems.length > 0); // Enable delete button if items are selected
        },

        // 8. onDeleteSelected: Deletes selected files from the attachments table
        onDeleteSelected: function () {
            const oTable = this.byId("fileTable1");
            if (!oTable) {
                MessageToast.show("File table not found."); // Notify if table is not found
                return;
            }
            const aSelectedItems = oTable.getSelectedItems();
            if (aSelectedItems.length > 0) {
                const oModel = this.getView().getModel("SampleModel");
                if (!oModel) {
                    MessageToast.show("SampleModel is not set."); // Notify if model is not set
                    return;
                }
                let aAttachments = oModel.getProperty("/AttachmentSet") || [];

                aSelectedItems.forEach(oItem => {
                    const oContext = oItem.getBindingContext("SampleModel");
                    if (oContext) {
                        const oFile = oContext.getObject();
                        if (oFile && oFile.Filename) {
                            aAttachments = aAttachments.filter(file => file.Filename !== oFile.Filename); // Remove selected files
                        }
                    } else {
                        console.error("Binding context is undefined for selected item.");
                    }
                });

                oModel.setProperty("/AttachmentSet", aAttachments); // Update model
                this.byId("deleteButton").setEnabled(false); // Disable delete button
                MessageToast.show("Selected files deleted."); // Notify user
            } else {
                MessageToast.show("No files selected for deletion."); // Notify if no files are selected
            }
        },

        // 9. onAddPress: Opens the inbound item dialog for adding new inventory items
        onAddPress: function () {
            if (!this._oInboundItemDialog) {
                this._oInboundItemDialog = sap.ui.xmlfragment("alcami.view.fragment.InboundItem", this);
                this.getView().addDependent(this._oInboundItemDialog);
            }
            this._oInboundItemDialog.open(); // Open the dialog
        },

        // 10. onDeleteSelectedItems: Deletes selected inventory items from the table
        onDeleteSelectedItems: function () {
            var oTable = this.byId("OIMTable");
            var oModel = this.getView().getModel("InputItemsModel");
            var aItems = oModel.getProperty("/InboundItemset");
            var aSelectedItems = oTable.getSelectedItems();
        
            if (!oTable || !oModel) {
                MessageToast.show("Table or model not found."); // Notify if table or model is not found
                return;
            }
        
            if (aSelectedItems.length === 0) {
                MessageToast.show("No items selected for deletion."); // Notify if no items are selected
                return;
            }
        
            // Remove selected items from the data model
            aSelectedItems.forEach(function (oSelectedItem) {
                var sPath = oSelectedItem.getBindingContext("InputItemsModel").getPath();
                var iIndex = parseInt(sPath.substring(sPath.lastIndexOf('/') + 1));
                if (!isNaN(iIndex)) {
                    aItems.splice(iIndex, 1); // Remove item from array
                }
            });
        
            oModel.setProperty("/InboundItemset", aItems); // Update model
            oTable.removeSelections(); // Clear selections
        
            MessageToast.show("Selected items deleted successfully."); // Notify user
        },

        // 11. onSelectedLineInventoryItems: Handles selection of inventory items in the table
        onSelectedLineInventoryItems: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext("InputItemsModel");
            var oData = oContext.getObject();
            MessageToast.show("Selected: " + oData.Customermaterial); // Notify user of selected item
        },

        // --- Additional/Fragment-related Functions ---
        // Handles date changes for the "To Place Conditions" DatePicker
        onDateToPlaceConditionsChange: function (oEvent) {
            this._handleDateChange(oEvent); // Call helper function to handle date validation
        },

        // Handles search in the project value help dialog
        onProjectSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("value");
            const aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter("ProjectName", FilterOperator.Contains, sQuery)); // Filter based on project name
            }
            const oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(aFilters); // Apply filters to binding
        },

        // Handles closing of the project value help dialog
        onProjectVHClose: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sProjectName = oSelectedItem.getTitle();
                this.getView().byId("projectInput").setValue(sProjectName); // Set selected project name in input
                MessageToast.show("Selected Project: " + sProjectName); // Notify user
            }
        },

        // Handles adding a new inbound item
        InboundonAddPress: function () {
            const oModel = this.getView().getModel("InputItemsModel");
            const aItems = oModel.getProperty("/InboundItemset");

            const sCustomerMaterialNumber = sap.ui.getCore().byId("customerMaterialInput").getValue();
            if (!sCustomerMaterialNumber) {
                MessageToast.show("Please enter or select a Customer Material Number."); // Notify if input is empty
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
                MessageToast.show("Customer Material Number not found in data."); // Notify if material not found
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
        
            aItems.push(oNewItem); // Add new item to the array
            oModel.setProperty("/InboundItemset", aItems); // Update model
        
            this._oInboundItemDialog.close(); // Close the dialog
            MessageToast.show("Item added successfully."); // Notify user
        },

        // Handles cancel action in the inbound item dialog
        onInboundItemCancel: function () {
            if (this._oInboundItemDialog) {
                this._oInboundItemDialog.close(); // Close the dialog
            }
        },

        // Opens the customer material value help dialog
        onCustomerMaterialValueHelp: function () {
            if (!this._customerMaterialDialog) {
                this._customerMaterialDialog = sap.ui.xmlfragment("alcami.view.fragment.CustomerMaterialValueHelp", this);
                this.getView().addDependent(this._customerMaterialDialog);
            }
            this._customerMaterialDialog.open(); // Open the dialog
        },

        // Handles search in the customer material value help dialog
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
            oBinding.filter(aFilters, "Application"); // Apply filters to binding
        },

        // Opens the storage conditions value help dialog
        onStorageConditionsVH1: function () {
            if (!this._storageDialog) {
                this._storageDialog = sap.ui.xmlfragment("alcami.view.fragment.storage", this);
                this.getView().addDependent(this._storageDialog);
            }
            this._storageDialog.open(); // Open the dialog
        },

        // Handles closing of the customer material value help dialog
        onCustomerMaterialVHClose: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems");
            if (aSelectedItems && aSelectedItems.length > 0) {
                const aSelectedMaterialNumbers = aSelectedItems.map(oItem => oItem.getTitle());
                MessageToast.show("Selected: " + aSelectedMaterialNumbers.join(", ")); // Notify user of selected items

                const oInput = sap.ui.getCore().byId("customerMaterialInput");
                if (oInput) {
                    oInput.setValue(aSelectedMaterialNumbers.join(", ")); // Set selected values in input
                } else {
                    console.error("customerMaterialInput not found."); // Log error if input not found
                }
            }
        },

        // Called when the Storage Conditions value help is opened
        onStorageConditionsVH: function (oEvent) {
            // Save the reference to the input control that triggered the value help
            this._oInputField = oEvent.getSource();
            console.log(this._oInputField);

            if (!this._oStorageConditionsDialog) {
                this._oStorageConditionsDialog = sap.ui.xmlfragment("alcami.view.fragment.storage", this);
                this.getView().addDependent(this._oStorageConditionsDialog);
            }
            this._oStorageConditionsDialog.open(); // Open the dialog
        },

        // Called when the Storage Conditions value help is closed
        onStorageConditionVHClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sTitle = oSelectedItem.getTitle();
                console.log(sTitle);
                if (this._oInputField) {
                    console.log(this._oInputField.setValue(sTitle));

                    this._oInputField.setValue(sTitle); // Set the value of the input field
                    
                    MessageToast.show("Selected Storage Condition: " + sTitle); // Notify user
                } else {
                    console.error("Input field reference is not set."); // Log error if reference is not set
                }
            } else {
                MessageToast.show("No item selected."); // Notify if no item was selected
            }
            this._oInputField = null; // Clear the reference
            oEvent.getSource().getBinding("items").filter([]); // Clear filters
        },

        onReviewPress: function() {
            var oView = this.getView();
            var bValid = true;
        
            // Validate Step 1
            var aRequiredFieldsStep1 = [
                oView.byId("customer"),
                oView.byId("projectInput"),
                oView.byId("carrierInput"),
                oView.byId("arrivalDateInput"),
                oView.byId("shipFromInput"),
                oView.byId("shippingTemperatureInput"),
                oView.byId("shipmentFlexibilityInput"),
                oView.byId("shippingMaterialProviderInput"),
                oView.byId("dimensionsInput"),
                oView.byId("TemperatureDeviceProvider"),
                oView.byId("TDQ"),
                oView.byId("TDD"),
                oView.byId("dateToPlaceConditionsInput")
            ];
        
            aRequiredFieldsStep1.forEach(function(oField) {
                if (!oField.getValue()) {
                    oField.setValueState("Error");
                    bValid = false;
                } else {
                    oField.setValueState("None");
                }
            });
        
            // Validate Step 2 (if needed)
            // You can add similar validation for Step 2 if there are required fields
        
            if (bValid) {
                // Proceed to the next step or show a success message
                sap.m.MessageToast.show("All required fields are valid!");
            } else {
                // Show an error message
                sap.m.MessageToast.show("Please fill all required fields.");
            }
        },
                


        // --- Private/Helper Functions ---
        // Sets the minimum date for a DatePicker control
        _setMinDate: function (oDatePicker, oDate) {
            if (oDatePicker) {
                oDatePicker.setMinDate(oDate); // Set minimum date
            }
        },

        // Handles date validation for DatePicker controls
        _handleDateChange: function (oEvent) {
            const oDatePicker = oEvent.getSource();
            const oSelectedDate = oDatePicker.getDateValue();
            if (oSelectedDate && (oSelectedDate.getDay() === 0 || oSelectedDate.getDay() === 6)) {
                MessageToast.show("Please select a date that is not a Saturday or Sunday."); // Notify if date is invalid
                oDatePicker.setDateValue(null); // Clear the date value
            }
        },

        // Toggles visibility of controls based on a boolean value
        _toggleVisibility: function (bVisible, aControls) {
            aControls.forEach(function (oControl) {
                if (oControl && oControl.getParent()) {
                    oControl.getParent().setVisible(bVisible); // Set visibility
                }
            });
        }
    });
});

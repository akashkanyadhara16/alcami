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
        onInit: function () {
            const oModel = new JSONModel();
            oModel.loadData("/model/data.json", null, false);
            this.getView().setModel(oModel);

            const oInputItemsModel = new JSONModel({ InboundItemset: [] });
            this.getView().setModel(oInputItemsModel, "InputItemsModel");

            const oSampleModel = new JSONModel({ "AttachmentSet": [] });
            this.getView().setModel(oSampleModel, "SampleModel");

            const oToday = new Date();
            this._setMinDate(this.getView().byId("arrivalDateInput"), oToday);
            this._setMinDate(this.getView().byId("dateToPlaceConditionsInput"), oToday);

            this.getView().byId("customer").setValue("C001");
        },

        onOpenValueHelp: function () {
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = sap.ui.xmlfragment("alcami.view.fragment.ProjectSelection", this);
                this.getView().addDependent(this._oValueHelpDialog);
            }
            const sCustomerInputValue = this.getView().byId("customer").getValue();
            const oBinding = this._oValueHelpDialog.getBinding("items");
            oBinding.filter(sCustomerInputValue ? [new Filter("CustomerID", FilterOperator.EQ, sCustomerInputValue)] : []);
            this._oValueHelpDialog.open();
        },

        onCarrierChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oView = this.getView();
            this._toggleVisibility(sSelectedKey === "Alcami Courier", [
                oView.byId("shippingMaterialProviderInput"),
                oView.byId("dimensionsInput"),
                oView.byId("TemperatureDeviceProvider")
            ]);
        },

        onArrivalDateChange: function (oEvent) {
            this._handleDateChange(oEvent);
        },

        onStabilityChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oVBox = this.getView().byId("dateToPlaceConditionsVBox");
            if (oVBox) {
                oVBox.setVisible(sSelectedKey !== "no");
            }
        },

        onTemperatureDeviceProviderChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oTDQ = this.getView().byId("TDQ");
            if (sSelectedKey === "NoneRequired" && oTDQ) {
                oTDQ.setSelectedKey("None");
            }
        },

        onUploadDocuments: function (oEvent) {
            const aFiles = oEvent.getParameter("files");
            const oModel = this.getView().getModel("SampleModel");
            const aAttachments = oModel.getProperty("/AttachmentSet") || [];

            for (let i = 0; i < aFiles.length; i++) {
                const file = aFiles[i];
                const reader = new FileReader();

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

                reader.readAsDataURL(file);
            }
            MessageToast.show("Attachment Added");
            this.onUploadCompleted();
        },

        onSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedItems = oTable.getSelectedItems();
            this.byId("deleteButton").setEnabled(aSelectedItems.length > 0);
        },

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

        onAddPress: function () {
            if (!this._oInboundItemDialog) {
                this._oInboundItemDialog = sap.ui.xmlfragment("alcami.view.fragment.InboundItem", this);
                this.getView().addDependent(this._oInboundItemDialog);
            }
            

            this._oInboundItemDialog.open();
        },

        onDeleteSelectedItems: function () {
            const oTable = this.byId("OIMTable");
            const oModel = this.getView().getModel("InputItemsModel");
            const aItems = oModel.getProperty("/InboundItemset");
            const aSelectedItems = oTable.getSelectedItems();
        
            if (!oTable || !oModel) {
                MessageToast.show("Table or model not found.");
                return;
            }
        
            if (aSelectedItems.length === 0) {
                MessageToast.show("No items selected for deletion.");
                return;
            }
        
            // Create a set of indices to delete
            const aIndicesToDelete = aSelectedItems.map(oSelectedItem => {
                const sPath = oSelectedItem.getBindingContext("InputItemsModel").getPath();
                return parseInt(sPath.substring(sPath.lastIndexOf('/') + 1), 10);
            });
        
            // Sort indices in descending order to avoid index shifting issues
            aIndicesToDelete.sort((a, b) => b - a);
        
            // Remove items from the model
            aIndicesToDelete.forEach(iIndex => {
                if (!isNaN(iIndex) && iIndex >= 0 && iIndex < aItems.length) {
                    aItems.splice(iIndex, 1);
                }
            });
        
            // Update the model
            oModel.setProperty("/InboundItemset", aItems);
            oTable.removeSelections();
            MessageToast.show("Selected items deleted successfully.");
        },
        

        onSelectedLineInventoryItems: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            const oContext = oSelectedItem.getBindingContext("InputItemsModel");
            const oData = oContext.getObject();
            MessageToast.show("Selected: " + oData.Customermaterial);
        },

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
            const aSelectedCustomerMaterialNumbers = sap.ui.getCore().byId("customerMaterialInput").getValue().split(",").map(item => item.trim());
        
            if (aSelectedCustomerMaterialNumbers.length === 0) {
                MessageToast.show("Please enter or select Customer Material Numbers.");
                return;
            }
        
            const oMainModel = this.getView().getModel();
            const aCustomerMaterials = oMainModel.getProperty("/customerMaterial") || [];
            const existingCustomerMaterials = aItems.map(item => item.Customermaterial);
        
            const newItems = [];
        
            aSelectedCustomerMaterialNumbers.forEach(sCustomerMaterialNumber => {
                if (!sCustomerMaterialNumber) return; // Skip empty values
        
                const oMaterial = aCustomerMaterials.find(item => item.customerMaterialNumber === sCustomerMaterialNumber);
        
                if (!oMaterial) {
                    MessageToast.show(`Customer Material Number "${sCustomerMaterialNumber}" not found in data.`);
                    return;
                }
        
                if (existingCustomerMaterials.includes(sCustomerMaterialNumber)) {
                    MessageToast.show(`Customer Material Number "${sCustomerMaterialNumber}" is already added.`);
                    return;
                }
        
                const oNewItem = {
                    Customermaterial: sCustomerMaterialNumber,
                    Materialdescription: oMaterial.materialDescription,
                    Uom: oMaterial.uom,
                    OrderQuantity: 0,
                    StorageConditions: "",
                    Notes: ""
                };
        
                newItems.push(oNewItem);
            });
        
            // Add new items to the model if there are any
            if (newItems.length > 0) {
                aItems.push(...newItems);
                oModel.setProperty("/InboundItemset", aItems);
                this._oInboundItemDialog.close();
                MessageToast.show("Items added successfully.");
            } else {
                MessageToast.show("No new items to add.");
            }
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
                aFilters.push(new Filter({
                    filters: [
                        new Filter("customerMaterialNumber", FilterOperator.Contains, sValue),
                        new Filter("materialDescription", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }

            const oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onStorageConditionsVH1: function () {
            if (!this._storageDialog) {
                this._storageDialog = sap.ui.xmlfragment("alcami.view.fragment.storage", this);
                this.getView().addDependent(this._storageDialog);
            }
            this._storageDialog.open();
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

        onStorageConditionsVH: function (oEvent) {
            this._oInputField = oEvent.getSource();
            if (!this._oStorageConditionsDialog) {
                this._oStorageConditionsDialog = sap.ui.xmlfragment("alcami.view.fragment.storage", this);
                this.getView().addDependent(this._oStorageConditionsDialog);
            }
            this._oStorageConditionsDialog.open();
        },

        onStorageConditionVHClose: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sTitle = oSelectedItem.getTitle();
                if (this._oInputField) {
                    this._oInputField.setValue(sTitle);
                    MessageToast.show("Selected Storage Condition: " + sTitle);
                } else {
                    console.error("Input field reference is not set.");
                }
            } else {
                MessageToast.show("No item selected.");
            }
            this._oInputField = null;
            oEvent.getSource().getBinding("items").filter([]);
        },

        onReviewPress: function () {
            const oView = this.getView();
            const aMissingFields = [];
            let bValid = true;
        
            const sCarrierSelectedKey = oView.byId("carrierInput").getSelectedKey();
            const StabilitySelectedKey = oView.byId("stability").getSelectedKey();
        
            const aRequiredFieldsStep1 = [
                { id: "customer", label: "Customer" },
                { id: "projectInput", label: "Project" },
                { id: "carrierInput", label: "Carrier" },
                { id: "arrivalDateInput", label: "Arrival Date" },
                { id: "shipFromInput", label: "Ship From" },
                { id: "shippingTemperatureInput", label: "Shipping Temperature" },
                { id: "shipmentFlexibilityInput", label: "Shipment Flexibility" },
                { id: "stability", label: "Stability" },
                { id: "shippingMaterialProviderInput", label: "Shipping Material Provider" },
                { id: "dimensionsInput", label: "Dimensions" },
                { id: "TemperatureDeviceProvider", label: "Temperature Device Provider" },
                { id: "TDQ", label: "TDQ" },
                { id: "TDD", label: "TDD" },
                { id: "dateToPlaceConditionsInput", label: "Date to Place Conditions" }
            ];
        
            aRequiredFieldsStep1.forEach(({ id, label }) => {
                const oField = oView.byId(id);
        
                // Skip validation for specific fields if "Alcami Courier" is not selected
                if (
                    sCarrierSelectedKey !== "Alcami Courier" &&
                    (id === "shippingMaterialProviderInput" ||
                     id === "dimensionsInput" ||
                     id === "TemperatureDeviceProvider")
                ) {
                    return;
                }
        
                // Skip validation for "Date to Place Conditions" if Stability is not "Yes"
                if (
                    StabilitySelectedKey !== "Yes" &&
                    id === "dateToPlaceConditionsInput"
                ) {
                    return;
                }
        
                if (!oField.getValue()) {
                    oField.setValueState("Error");
                    aMissingFields.push(label);
                    bValid = false;
                } else {
                    oField.setValueState("None");
                }
            });
        
            if (bValid) {
                this.onReviewPress1();
            } else {
                this._showMissingFieldsFragment(aMissingFields);
            }
        },        

        _showMissingFieldsFragment: function (aMissingFields) {
            const oView = this.getView();
            if (!this._oMissingFieldsDialog) {
                this._oMissingFieldsDialog = sap.ui.xmlfragment(oView.getId(), "alcami.view.fragment.MissingFieldsDialog", this);
                oView.addDependent(this._oMissingFieldsDialog);
            }

            const oModel = new JSONModel({
                fields: aMissingFields.map(label => ({ title: label }))
            });
            this._oMissingFieldsDialog.setModel(oModel);
            this._oMissingFieldsDialog.open();
        },

        onCloseMissingFieldsDialog: function () {
            this._oMissingFieldsDialog.close();
        },

        onReviewPress1: function () {
            const oWizard = this.getView().byId("wizard");
            const oNavContainer = this.getView().byId("NavContainer");
            const oWizardReviewPage = this.getView().byId("wizardReviewPage");

            const bValidStep1 = this.validateWizardStep1(this.getView().byId("step1"));
            const bValidStep2 = this.validateWizardStep2(this.getView().byId("OrderInventory"));

            if (!bValidStep1 || !bValidStep2) {
                MessageToast.show("Please fill all required fields before proceeding to review.");
                return;
            }

            this.collectDataForReview();
            oNavContainer.to(oWizardReviewPage);
        },

        validateWizardStep1: function (oWizardStep) {
            const aControls = oWizardStep.getContent()[0].getItems();
            let bValid = true;

            aControls.forEach(oHBox => {
                if (oHBox instanceof sap.m.HBox) {
                    oHBox.getItems().forEach(oVBox => {
                        if (oVBox instanceof sap.m.VBox) {
                            const aVBoxItems = oVBox.getItems();
                            const oLabel = aVBoxItems[0];
                            const oInput = aVBoxItems[1];

                            if (oLabel && oLabel.getRequired()) {
                                const sValue = oInput instanceof sap.m.Input || oInput instanceof sap.m.TextArea
                                    ? oInput.getValue()
                                    : oInput instanceof sap.m.ComboBox
                                        ? oInput.getSelectedKey()
                                        : oInput instanceof sap.m.DatePicker
                                            ? oInput.getValue()
                                            : "";

                                if (!sValue) {
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText("This field is required");
                                    bValid = false;
                                } else {
                                    oInput.setValueState("None");
                                }
                            }
                        }
                    });
                }
            });

            return bValid;
        },

        validateWizardStep2: function (oWizardStep) {
            const oTable = oWizardStep.getContent()[0].getContent()[0];
            const aItems = oTable.getItems();
            let bValid = true;

            aItems.forEach(oItem => {
                const aCells = oItem.getCells();
                const oOrderQuantityInput = aCells[3];
                const oStorageConditionsInput = aCells[4];

                if (!oOrderQuantityInput.getValue()) {
                    oOrderQuantityInput.setValueState("Error");
                    oOrderQuantityInput.setValueStateText("Order Quantity is required");
                    bValid = false;
                } else {
                    oOrderQuantityInput.setValueState("None");
                }

                if (!oStorageConditionsInput.getValue()) {
                    oStorageConditionsInput.setValueState("Error");
                    oStorageConditionsInput.setValueStateText("Storage Conditions is required");
                    bValid = false;
                } else {
                    oStorageConditionsInput.setValueState("None");
                }
            });

            return bValid;
        },

        collectDataForReview: function () {
            // Implement your data collection logic here
        },

        showReviewPage: function () {
            const oNavContainer = this.getView().byId("NavContainer");
            const oWizardReviewPage = this.getView().byId("wizardReviewPage");
            oNavContainer.to(oWizardReviewPage);
        },

        editAttachedItems: function() {
            // Get the NavContainer
            var oNavContainer = this.byId("NavContainer");
            // Navigate back to the page containing the wizard
            oNavContainer.to(this.byId("page"));
            // Get the Wizard control
            var oWizard = this.byId("wizard");
            // Get the WizardStep with id 'step1'
            var oStep1 = this.byId("step1");
            if (oWizard && oStep1) {
              // Navigate Wizard to the first step where attached documents are
              oWizard.goToStep(oStep1);
            } else {
              // Fallback: Log error if controls not found
              jQuery.sap.log.error("Wizard or WizardStep not found");
            }
          },       

          editInboundItems: function() {
            // Get the NavContainer
            var oNavContainer = this.byId("NavContainer");
          
            // Navigate back to the page containing the wizard
            oNavContainer.to(this.byId("page"));
          
            // Get the Wizard control
            var oWizard = this.byId("wizard");
            // Get the WizardStep with id 'OrderInventory'
            var oOrderInventoryStep = this.byId("OrderInventory");
          
            if (oWizard && oOrderInventoryStep) {
              // Navigate Wizard to the Inbound Items step
              oWizard.goToStep(oOrderInventoryStep);
            } else {
              // Log error if controls not found
              jQuery.sap.log.error("Wizard or OrderInventory WizardStep not found");
            }
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

        _toggleVisibility: function (bVisible, aControls) {
            aControls.forEach(oControl => {
                if (oControl && oControl.getParent()) {
                    oControl.getParent().setVisible(bVisible);
                }
            });
        }
    });
});

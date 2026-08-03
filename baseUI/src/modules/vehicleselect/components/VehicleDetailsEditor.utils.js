import { ref, defineAsyncComponent } from "vue"
import { openFormDialog } from "@/services/popup"
import { ACCENTS } from "@/common/components/base"
import { lua } from "@/bridge"
// async to avoid a circular dependency with the component (which imports this file)
const VehicleDetailsEditorComponent = defineAsyncComponent(() => import("./VehicleDetailsEditor.vue"))

export const typeOptions = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "coupe", label: "Coupe" },
  { value: "hatchback", label: "Hatchback" },
  { value: "van", label: "Van" },
]

export const bodyStyleOptions = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "coupe", label: "Coupe" },
  { value: "hatchback", label: "Hatchback" },
  { value: "wagon", label: "Wagon" },
  { value: "convertible", label: "Convertible" },
  { value: "pickup", label: "Pickup" },
  { value: "van", label: "Van" },
]

function formValidator(model) {
  if (!model.name || model.name.trim() === "") {
    return { error: true, message: "Name is required" }
  }
  return { error: false }
}

async function getVehicleDataFromLua(data) {
  try {
    // Get metadata from Lua backend
    const metadata = await lua.ui_vehicleSelector_vehicleMetadataEditor.getVehicleMetadataDetails(data)

    if (!metadata) {
      throw new Error("Metadata is null or undefined")
    }

    return {
      name: metadata.name || "Default Vehicle Name",
      description: metadata.description || "Default vehicle description",
      type: metadata.type || "sedan",
      bodyStyle: metadata.bodyStyle || "sedan",
      licensePlate: metadata.licensePlate || "",
      paint1: metadata.paint1 || "",
      paint2: metadata.paint2 || "",
      paint3: metadata.paint3 || "",
      price: metadata.price || 0,
    }
  } catch (error) {
    console.error("Failed to get vehicle metadata from Lua:", error)
    // Return default values on error
    return {
      name: "Default Vehicle Name",
      description: "Default vehicle description",
      type: "sedan",
      bodyStyle: "sedan",
      licensePlate: "",
      paint1: "",
      paint2: "",
      paint3: "",
      price: 0,
    }
  }
}

export async function openVehicleDetailsEditor(data) {
  if (!data) {
    console.error("openVehicleDetailsEditor: data is required")
    return
  }

  // Get current data from Lua backend
  const vehicleData = await getVehicleDataFromLua(data)

  // Extract vehicle model and config from data for display/saving
  const vehicleModel = data.vehicleModel || data.model || { id: data.modelId || data.model || "unknown" }
  const vehicleConfig = data.vehicleConfig || data.config || { id: data.configId || data.config || "unknown" }

  // Create form model - FormDialog will make it reactive
  const formModel = {
    name: vehicleData?.name || "",
    description: vehicleData?.description || "",
    type: vehicleData?.type || "sedan",
    bodyStyle: vehicleData?.bodyStyle || "sedan",
    licensePlate: vehicleData?.licensePlate || "",
    paint1: vehicleData?.paint1 || "",
    paint2: vehicleData?.paint2 || "",
    paint3: vehicleData?.paint3 || "",
    price: vehicleData?.price || 0,
  }

  const buttons = [
    { label: "Save/Override", value: "save", emitData: true, extras: { accent: ACCENTS.main } },
    { label: "Cancel", value: "cancel", extras: { cancel: true, accent: ACCENTS.secondary } },
    { label: "Delete", value: "delete", emitData: true, extras: { accent: ACCENTS.attention } },
  ]

  const modelId = vehicleModel.id || vehicleModel
  const configId = vehicleConfig.id || vehicleConfig

  const result = await openFormDialog(
    VehicleDetailsEditorComponent,
    formModel,
    formValidator,
    "Edit Vehicle Details",
    `Editing: ${modelId} - ${configId}`,
    buttons,
    "50rem"
  )

  if (result && result.value) {
    if (result.value === "save") {
      console.log("Saving vehicle config:", result.formData)
      // TODO: Call Lua backend to save/override config
      // await lua.extensions.ui_vehicleSelector.saveConfig(vehicleModel.id, vehicleConfig.id, result.formData)
    } else if (result.value === "delete") {
      console.log("Deleting vehicle config:", result.formData)
      // TODO: Call Lua backend to delete config
      // await lua.extensions.ui_vehicleSelector.deleteConfig(vehicleModel.id, vehicleConfig.id)
    }
  }

  return result
}


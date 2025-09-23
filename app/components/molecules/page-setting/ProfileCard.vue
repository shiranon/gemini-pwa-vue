<template>
  <div class="border-border/70 bg-card text-card-foreground flex flex-col gap-5 rounded-2xl border px-4 py-5 shadow-sm md:px-6">
    <div class="flex flex-row items-start gap-5">
      <div class="flex flex-1 items-start gap-4">
        <div class="bg-muted/60 text-muted-foreground border-border/60 flex h-16 w-16 items-center justify-center rounded-full border">
          <Icon
            icon="material-symbols:account-circle"
            class="h-9 w-9"
          />
        </div>
        <div class="min-w-45 flex-1">
          <p class="text-muted-foreground/80 text-xs">設定プロファイル</p>
          <div class="flex items-start gap-2">
            <p class="text-foreground truncate text-lg font-semibold">
              {{ selectedProfile?.name ?? '新規プロファイル' }}
            </p>
            <span
              v-if="selectedProfile?.isDefault"
              class="bg-primary/10 text-foreground/80 mt-0.5 rounded-full px-2 py-0.5 text-[10px]"
            >
              デフォルト
            </span>
            <Button
              type="button"
              class="text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:text-muted-foreground/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white transition disabled:cursor-not-allowed"
              :disabled="selectedProfile?.isDefault"
              @click.stop="handleEdit"
            >
              <Icon
                icon="material-symbols:edit"
                class="h-4 w-4"
              />
            </Button>
          </div>
          <p
            v-if="selectedProfileSummary"
            class="text-muted-foreground mt-1 truncate text-xs"
          >
            {{ selectedProfileSummary }}
          </p>
          <p
            v-else
            class="text-muted-foreground mt-1 text-xs"
          >
            プロファイルを選択するか新規保存してください
          </p>
          <p
            v-if="selectedProfile?.description"
            class="text-muted-foreground/80 mt-1 truncate text-[11px]"
          >
            {{ selectedProfile.description }}
          </p>
        </div>
      </div>

      <div class="w-auto">
        <p class="text-muted-foreground text-xs">プロファイルを選択</p>
        <Select
          :model-value="selectedId"
          @update:model-value="handleProfileChange"
        >
          <SelectTrigger
            class="border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30 bg-background mt-1 w-full rounded-xl border px-3 py-2 transition focus:ring-2 focus:outline-none"
            :disabled="!profiles.length"
          >
            <SelectValue
              class="w-20 justify-center"
              :placeholder="selectPlaceholder"
            >
              {{ selectedProfile?.name || selectPlaceholder }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent class="mr-6 w-60">
            <SelectGroup>
              <SelectLabel class="text-xs">利用可能なプロファイル</SelectLabel>
              <SelectItem
                v-for="profile in profiles"
                :key="profile.id"
                :value="profile.id"
                class="cursor-pointer py-2"
              >
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ profile.name }}</span>
                    <span
                      v-if="profile.isDefault"
                      class="bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                    >
                      デフォルト
                    </span>
                  </div>
                  <span
                    v-if="profile.description"
                    class="text-muted-foreground/80 truncate text-[11px]"
                  >
                    {{ profile.description }}
                  </span>
                  <span
                    v-if="createSummary(profile)"
                    class="text-muted-foreground/70 text-[11px]"
                  >
                    {{ createSummary(profile) }}
                  </span>
                </div>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        @click="handleCreate"
      >
        <Icon
          icon="material-symbols:person-add"
          class="h-5 w-5"
        />
        新規保存
      </Button>

      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        :disabled="!selectedProfile || selectedProfile.isDefault"
        @click="handleDelete"
      >
        <Icon
          icon="material-symbols:person-remove"
          class="h-5 w-5"
        />
        削除
      </Button>

      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        :disabled="!selectedProfile"
        @click="handleExport"
      >
        <Icon
          icon="material-symbols:upload"
          class="h-5 w-5"
        />
        出力
      </Button>

      <Button
        variant="secondary"
        class="flex h-12 items-center justify-center gap-2 rounded-xl"
        @click="handleImport"
      >
        <Icon
          icon="material-symbols:download"
          class="h-5 w-5"
        />
        取込
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import { Icon } from '@iconify/vue'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { SettingsProfile } from '~/types/settings'

const props = defineProps<{
  profiles: SettingsProfile[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  edit: [profileId: string]
  create: []
  delete: [profileId: string]
  export: [profileId: string]
  import: []
}>()

const selectedId = ref<string | null>(props.modelValue ?? null)

watch(
  () => props.modelValue,
  (value) => {
    selectedId.value = value ?? null
  }
)

watch(
  () => props.profiles,
  (profiles) => {
    if (!profiles?.length) {
      if (selectedId.value !== null) {
        selectedId.value = null
        emit('update:modelValue', null)
      }
      return
    }

    const exists = profiles.some((profile) => profile.id === selectedId.value)
    if (!exists) {
      const nextValue = profiles.some((profile) => profile.id === props.modelValue) ? props.modelValue : null
      if (selectedId.value !== nextValue) {
        selectedId.value = nextValue
        emit('update:modelValue', nextValue ?? null)
      }
    }
  }
)

const selectedProfile = computed(() => {
  return props.profiles.find((profile) => profile.id === selectedId.value) ?? null
})

const formatDecimal = (value: number | null) => {
  if (value === null || value === undefined) {
    return ''
  }
  if (Number.isInteger(value)) {
    return value.toString()
  }
  return value.toFixed(2)
}

const createSummary = (profile: SettingsProfile | null) => {
  if (!profile) {
    return ''
  }
  const parts: string[] = []
  const { modelName, temperature, topP } = profile.settings
  if (modelName) {
    parts.push(modelName)
  }
  const formattedTemperature = formatDecimal(temperature)
  if (formattedTemperature) {
    parts.push(`T: ${formattedTemperature}`)
  }
  const formattedTopP = formatDecimal(topP)
  if (formattedTopP) {
    parts.push(`P: ${formattedTopP}`)
  }
  return parts.join(' / ')
}

const selectedProfileSummary = computed(() => createSummary(selectedProfile.value))

const selectPlaceholder = computed(() => {
  if (!props.profiles.length) {
    return 'プロファイルがありません'
  }
  return 'プロファイルを選択'
})

const handleProfileChange = (value: AcceptableValue) => {
  if (value === null || value === undefined) {
    selectedId.value = null
    emit('update:modelValue', null)
    return
  }

  const profileId = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  if (!profileId || profileId === 'null' || profileId === 'undefined') {
    selectedId.value = null
    emit('update:modelValue', null)
    return
  }

  if (selectedId.value !== profileId) {
    selectedId.value = profileId
  }
  emit('update:modelValue', profileId)
}

const handleEdit = () => {
  if (selectedId.value) {
    emit('edit', selectedId.value)
  }
}

const handleCreate = () => {
  emit('create')
}

const handleDelete = () => {
  if (selectedId.value && !selectedProfile.value?.isDefault) {
    emit('delete', selectedId.value)
  }
}

const handleExport = () => {
  if (selectedId.value) {
    emit('export', selectedId.value)
  }
}

const handleImport = () => {
  emit('import')
}
</script>

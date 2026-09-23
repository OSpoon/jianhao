<script setup lang="ts">
import { useI18n } from "vue-i18n"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FAQ_ITEMS } from "@/features/posture/catalog"

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("faq.title") }}</CardTitle>
      <CardDescription>{{ t("faq.description") }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Accordion type="single" collapsible class="w-full">
        <AccordionItem
          v-for="(item, index) in FAQ_ITEMS"
          :key="item.key"
          :value="`faq-${index}`"
        >
          <AccordionTrigger>{{ t(`faq.${item.key}Q`) }}</AccordionTrigger>
          <AccordionContent>
            <p class="text-sm leading-6 text-muted-foreground">
              {{ t(`faq.${item.key}A`) }}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
</template>

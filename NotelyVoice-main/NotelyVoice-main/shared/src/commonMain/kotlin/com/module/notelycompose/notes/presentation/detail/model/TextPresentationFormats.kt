package com.module.notelycompose.notes.presentation.detail.model

import com.module.notelycompose.notes.extension.TEXT_NO_SELECTION
import com.module.notelycompose.notes.extension.TEXT_SIZE_BODY
import com.module.notelycompose.notes.extension.TEXT_SIZE_HEADING
import com.module.notelycompose.notes.extension.TEXT_SIZE_SUBHEADING
import com.module.notelycompose.notes.extension.TEXT_SIZE_TITLE

object TextPresentationFormats {
    val Title = TextFormatPresentationOption(TEXT_SIZE_TITLE)
    val Heading = TextFormatPresentationOption(TEXT_SIZE_HEADING)
    val SubHeading = TextFormatPresentationOption(TEXT_SIZE_SUBHEADING)
    val Body = TextFormatPresentationOption(TEXT_SIZE_BODY)
    val NoSelection = TextFormatPresentationOption(TEXT_NO_SELECTION)
}

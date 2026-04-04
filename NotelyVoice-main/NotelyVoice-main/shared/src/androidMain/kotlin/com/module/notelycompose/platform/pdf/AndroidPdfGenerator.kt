package com.module.notelycompose.platform.pdf

import android.content.Context
import android.graphics.pdf.PdfDocument
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.net.toUri

class AndroidPdfGenerator(private val context: Context) {

    companion object {
        private const val PAGE_WIDTH = 612 // 8.5 inches * 72 points per inch
        private const val PAGE_HEIGHT = 792 // 11 inches * 72 points per inch
        private const val MARGIN = 72 // 1 inch margin
        private const val LINE_SPACING = 1.2f
    }

    private val contentWidth = PAGE_WIDTH - (2 * MARGIN)
    private val contentHeight = PAGE_HEIGHT - (2 * MARGIN)

    /**
     * Create PDF document from text and save to target URI
     */
    fun createPdfDocument(text: String, targetUri: String, textSize: Float): Boolean {
        return try {
            val pdfDocument = PdfDocument()
            val textPaint = createTextPaint(textSize)
            val pages = splitTextIntoPages(text, textPaint)

            pages.forEachIndexed { pageIndex, pageText ->
                addPageToPdf(pdfDocument, pageText, textPaint, pageIndex + 1)
            }

            val uri = targetUri.toUri()
            context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                pdfDocument.writeTo(outputStream)
            }

            pdfDocument.close()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun createTextPaint(size: Float): TextPaint {
        return TextPaint().apply {
            color = android.graphics.Color.BLACK
            textSize = size
            typeface = Typeface.DEFAULT
            isAntiAlias = true
        }
    }

    private fun addPageToPdf(
        pdfDocument: PdfDocument,
        pageText: String,
        textPaint: TextPaint,
        pageNumber: Int
    ) {
        val pageInfo = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
        val page = pdfDocument.startPage(pageInfo)
        val canvas = page.canvas

        // Create text layout
        val staticLayout = StaticLayout.Builder
            .obtain(pageText, 0, pageText.length, textPaint, contentWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(0f, LINE_SPACING)
            .setIncludePad(false)
            .build()

        // Draw text on canvas with proper margins
        canvas.save()
        canvas.translate(MARGIN.toFloat(), MARGIN.toFloat())
        staticLayout.draw(canvas)
        canvas.restore()

        pdfDocument.finishPage(page)
    }

    private fun splitTextIntoPages(text: String, textPaint: TextPaint): List<String> {
        val pages = mutableListOf<String>()

        // Create a temporary StaticLayout to measure the full text
        val fullLayout = StaticLayout.Builder
            .obtain(text, 0, text.length, textPaint, contentWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(0f, LINE_SPACING)
            .setIncludePad(false)
            .build()

        // Calculate maximum height per page (with some buffer for safety)
        val maxHeightPerPage = contentHeight - 20 // 20pt buffer for safety

        var currentHeight = 0f
        var pageStartLine = 0

        // Process line by line based on actual height
        for (lineIndex in 0 until fullLayout.lineCount) {
            val lineTop = fullLayout.getLineTop(lineIndex)
            val lineBottom = fullLayout.getLineBottom(lineIndex)
            val lineHeight = lineBottom - lineTop

            // Check if adding this line would exceed page height
            if (currentHeight + lineHeight > maxHeightPerPage && pageStartLine < lineIndex) {
                // Create page from pageStartLine to current line
                val startChar = fullLayout.getLineStart(pageStartLine)
                val endChar = fullLayout.getLineStart(lineIndex)
                val pageText = text.substring(startChar, endChar).trim()
                pages.add(pageText)

                // Start new page
                pageStartLine = lineIndex
                currentHeight = lineHeight.toFloat()
            } else {
                currentHeight += lineHeight
            }
        }

        // Add remaining text as the last page
        if (pageStartLine < fullLayout.lineCount) {
            val startChar = fullLayout.getLineStart(pageStartLine)
            val pageText = text.substring(startChar, text.length).trim()
            pages.add(pageText)
        }

        return pages.ifEmpty { listOf("") }
    }
}

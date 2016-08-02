all: stack.pdf

clean:
	rm -f stack.aux stack.log stack.out stack.pdf

%.pdf: %.tex
	pdflatex "$<"
	pdflatex "$<"

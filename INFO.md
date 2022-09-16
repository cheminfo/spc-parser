> **Fexper: Instrumental Experiment Technique**
> This is the “experiment type” flag. In most Galactic SPC files in circulation today, the fexper
parameter has been left set at null. However, Galactic plans to use this value as an internal flag
to identify the instrumental technique that created the original data. This will allow future
products be “smart” and tailor the interface to perform operations that are typically done on that
type of data, while possibly disallowing other operations that don’t make any sense. All future
file conversion routines should take advantage of these flags when creating SPC files.
